import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OAuthStartPayload = {
  provider: string;
  return_to?: string;
};

const OAUTH_PROVIDERS = new Set(["fitbit", "google_fit"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse(
        { error: "Supabase env vars are not fully configured" },
        500
      );
    }

    const authHeader =
      req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader)
      return jsonResponse({ error: "Missing Authorization" }, 401);

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : authHeader.trim();

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse(
        { error: "Unauthorized", details: userError?.message },
        401
      );
    }

    const body = (await req.json()) as OAuthStartPayload;
    const provider = body.provider?.toLowerCase();
    if (!provider || !OAUTH_PROVIDERS.has(provider)) {
      return jsonResponse({ error: "Unsupported provider" }, 400);
    }

    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
    const returnTo = body.return_to || `${appUrl}/dashboard/health`;
    const state = crypto.randomUUID();

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: upsertIntegrationError } = await admin
      .from("health_integrations")
      .upsert(
        {
          user_id: user.id,
          provider,
          status: "pending",
          metadata: { oauth: true, started_at: new Date().toISOString() },
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertIntegrationError) {
      return jsonResponse(
        {
          error: "Failed to prepare integration row",
          details: upsertIntegrationError.message,
        },
        500
      );
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error: stateError } = await admin
      .from("health_oauth_states")
      .insert({
        user_id: user.id,
        provider,
        state,
        return_to: returnTo,
        expires_at: expiresAt,
      });

    if (stateError) {
      return jsonResponse(
        { error: "Failed to create oauth state", details: stateError.message },
        500
      );
    }

    if (provider === "fitbit") {
      const fitbitClientId = Deno.env.get("FITBIT_CLIENT_ID");
      const fitbitRedirectUri = Deno.env.get("FITBIT_REDIRECT_URI");
      if (!fitbitClientId || !fitbitRedirectUri) {
        return jsonResponse(
          {
            error: "Fitbit OAuth env vars are missing",
            required: ["FITBIT_CLIENT_ID", "FITBIT_REDIRECT_URI"],
          },
          500
        );
      }

      const scope =
        "activity heartrate nutrition profile settings sleep social weight";
      const authorizeUrl = new URL("https://www.fitbit.com/oauth2/authorize");
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", fitbitClientId);
      authorizeUrl.searchParams.set("redirect_uri", fitbitRedirectUri);
      authorizeUrl.searchParams.set("scope", scope);
      authorizeUrl.searchParams.set("state", state);

      return jsonResponse({
        provider,
        authorize_url: authorizeUrl.toString(),
      });
    }

    if (provider === "google_fit") {
      const googleClientId = Deno.env.get("GOOGLE_FIT_CLIENT_ID");
      const googleRedirectUri = Deno.env.get("GOOGLE_FIT_REDIRECT_URI");
      if (!googleClientId || !googleRedirectUri) {
        return jsonResponse(
          {
            error: "Google Fit OAuth env vars are missing",
            required: ["GOOGLE_FIT_CLIENT_ID", "GOOGLE_FIT_REDIRECT_URI"],
          },
          500
        );
      }

      const scope = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/fitness.activity.read",
        "https://www.googleapis.com/auth/fitness.heart_rate.read",
        "https://www.googleapis.com/auth/fitness.body.read",
        "https://www.googleapis.com/auth/fitness.location.read",
        "https://www.googleapis.com/auth/fitness.sleep.read",
        "https://www.googleapis.com/auth/fitness.blood_pressure.read",
        "https://www.googleapis.com/auth/fitness.blood_glucose.read",
        "https://www.googleapis.com/auth/fitness.body_temperature.read",
        "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
        "https://www.googleapis.com/auth/fitness.reproductive_health.read",
        "https://www.googleapis.com/auth/fitness.nutrition.read",
      ].join(" ");

      const authorizeUrl = new URL(
        "https://accounts.google.com/o/oauth2/v2/auth"
      );
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", googleClientId);
      authorizeUrl.searchParams.set("redirect_uri", googleRedirectUri);
      authorizeUrl.searchParams.set("scope", scope);
      authorizeUrl.searchParams.set("access_type", "offline");
      authorizeUrl.searchParams.set("include_granted_scopes", "true");
      authorizeUrl.searchParams.set("prompt", "consent");
      authorizeUrl.searchParams.set("state", state);

      return jsonResponse({
        provider,
        authorize_url: authorizeUrl.toString(),
      });
    }

    return jsonResponse({ error: "Provider not configured" }, 400);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
