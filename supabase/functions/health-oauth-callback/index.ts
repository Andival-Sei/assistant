import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

type OAuthStateRow = {
  user_id: string;
  provider: string;
  return_to: string;
  expires_at: string;
  used_at: string | null;
};

function buildRedirect(base: string, params: Record<string, string>) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value)
  );
  return url.toString();
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Supabase env vars are missing", { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const requestUrl = new URL(req.url);
    const state = requestUrl.searchParams.get("state");
    const code = requestUrl.searchParams.get("code");
    const providerError =
      requestUrl.searchParams.get("error") ||
      requestUrl.searchParams.get("error_description");

    if (!state) {
      const redirectTo = buildRedirect(`${appUrl}/dashboard/health`, {
        health_oauth: "error",
        reason: "missing_state",
      });
      return Response.redirect(redirectTo, 302);
    }

    const { data: oauthState, error: stateError } = await admin
      .from("health_oauth_states")
      .select("user_id, provider, return_to, expires_at, used_at")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !oauthState) {
      const redirectTo = buildRedirect(`${appUrl}/dashboard/health`, {
        health_oauth: "error",
        reason: "invalid_state",
      });
      return Response.redirect(redirectTo, 302);
    }

    const row = oauthState as OAuthStateRow;
    const redirectBase = row.return_to || `${appUrl}/dashboard/health`;
    const isExpired = new Date(row.expires_at).getTime() < Date.now();

    if (row.used_at || isExpired) {
      const redirectTo = buildRedirect(redirectBase, {
        health_oauth: "error",
        provider: row.provider,
        reason: isExpired ? "state_expired" : "state_already_used",
      });
      return Response.redirect(redirectTo, 302);
    }

    if (providerError || !code) {
      await admin
        .from("health_integrations")
        .upsert(
          {
            user_id: row.user_id,
            provider: row.provider,
            status: "error",
            metadata: {
              oauth_error: providerError || "missing_code",
              failed_at: new Date().toISOString(),
            },
          },
          { onConflict: "user_id,provider" }
        );

      await admin
        .from("health_oauth_states")
        .update({ used_at: new Date().toISOString() })
        .eq("state", state);

      const redirectTo = buildRedirect(redirectBase, {
        health_oauth: "error",
        provider: row.provider,
        reason: providerError || "missing_code",
      });
      return Response.redirect(redirectTo, 302);
    }

    if (row.provider !== "fitbit") {
      const redirectTo = buildRedirect(redirectBase, {
        health_oauth: "error",
        provider: row.provider,
        reason: "provider_not_implemented",
      });
      return Response.redirect(redirectTo, 302);
    }

    const fitbitClientId = Deno.env.get("FITBIT_CLIENT_ID");
    const fitbitClientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    const fitbitRedirectUri = Deno.env.get("FITBIT_REDIRECT_URI");

    if (!fitbitClientId || !fitbitClientSecret || !fitbitRedirectUri) {
      const redirectTo = buildRedirect(redirectBase, {
        health_oauth: "error",
        provider: "fitbit",
        reason: "missing_fitbit_env",
      });
      return Response.redirect(redirectTo, 302);
    }

    const basicAuth = btoa(`${fitbitClientId}:${fitbitClientSecret}`);
    const tokenBody = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: fitbitRedirectUri,
    });

    const tokenResponse = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    });

    const tokenJson = await tokenResponse.json();
    if (!tokenResponse.ok) {
      await admin
        .from("health_integrations")
        .upsert(
          {
            user_id: row.user_id,
            provider: "fitbit",
            status: "error",
            metadata: {
              oauth_error: tokenJson,
              failed_at: new Date().toISOString(),
            },
          },
          { onConflict: "user_id,provider" }
        );

      await admin
        .from("health_oauth_states")
        .update({ used_at: new Date().toISOString() })
        .eq("state", state);

      const redirectTo = buildRedirect(redirectBase, {
        health_oauth: "error",
        provider: "fitbit",
        reason: "token_exchange_failed",
      });
      return Response.redirect(redirectTo, 302);
    }

    const expiresIn = Number(tokenJson.expires_in || 0);
    const expiresAt =
      expiresIn > 0
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;
    const scopeList =
      typeof tokenJson.scope === "string"
        ? tokenJson.scope.split(" ").filter(Boolean)
        : [];

    const { error: tokenUpsertError } = await admin
      .from("health_integration_tokens")
      .upsert(
        {
          user_id: row.user_id,
          provider: "fitbit",
          access_token: tokenJson.access_token,
          refresh_token: tokenJson.refresh_token || null,
          token_type: tokenJson.token_type || null,
          scope: scopeList,
          expires_at: expiresAt,
          metadata: {
            fitbit_user_id: tokenJson.user_id ?? null,
            updated_via: "oauth_callback",
          },
        },
        { onConflict: "user_id,provider" }
      );

    if (tokenUpsertError) {
      const redirectTo = buildRedirect(redirectBase, {
        health_oauth: "error",
        provider: "fitbit",
        reason: "token_store_failed",
      });
      return Response.redirect(redirectTo, 302);
    }

    await admin
      .from("health_integrations")
      .upsert(
        {
          user_id: row.user_id,
          provider: "fitbit",
          status: "connected",
          connected_at: new Date().toISOString(),
          last_sync_at: null,
          access_scope: scopeList,
          metadata: { connected_via: "oauth_callback" },
        },
        { onConflict: "user_id,provider" }
      );

    await admin
      .from("health_oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("state", state);

    const redirectTo = buildRedirect(redirectBase, {
      health_oauth: "success",
      provider: "fitbit",
    });
    return Response.redirect(redirectTo, 302);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
