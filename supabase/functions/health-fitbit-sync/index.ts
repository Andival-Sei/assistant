import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FitbitTokenRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string[] | null;
};

type SyncRequest = {
  days?: number;
};

class FitbitApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    retryAfterSeconds: number | null
  ) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateRange(days: number): string[] {
  const safeDays = Math.min(Math.max(days, 1), 90);
  const out: string[] = [];
  const now = new Date();
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(toDateString(d));
  }
  return out;
}

async function fetchFitbitJson(
  path: string,
  accessToken: string
): Promise<Record<string, unknown> | null> {
  const response = await fetch(`https://api.fitbit.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : null;
    throw new FitbitApiError(
      `Fitbit API error ${response.status}: ${text}`,
      response.status,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

async function refreshFitbitToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  const basicAuth = btoa(`${params.clientId}:${params.clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
  });

  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Failed to refresh Fitbit token: ${JSON.stringify(json)}`);
  }
  return json;
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
    const fitbitClientId = Deno.env.get("FITBIT_CLIENT_ID");
    const fitbitClientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !fitbitClientId ||
      !fitbitClientSecret
    ) {
      return jsonResponse(
        { error: "Missing env vars for Fitbit sync function" },
        500
      );
    }

    const authHeader =
      req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization" }, 401);
    }

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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json().catch(() => ({}))) as SyncRequest;

    const { data: integrationRow } = await admin
      .from("health_integrations")
      .select("last_sync_at")
      .eq("user_id", user.id)
      .eq("provider", "fitbit")
      .maybeSingle();

    const requestedDays = body.days ?? null;
    const defaultDays = integrationRow?.last_sync_at ? 7 : 60;
    const days = Math.min(Math.max(requestedDays ?? defaultDays, 1), 90);

    const { data: tokenRow, error: tokenError } = await admin
      .from("health_integration_tokens")
      .select("access_token, refresh_token, expires_at, scope")
      .eq("user_id", user.id)
      .eq("provider", "fitbit")
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return jsonResponse(
        { error: "Fitbit token not found. Connect Fitbit first." },
        400
      );
    }

    let accessToken = (tokenRow as FitbitTokenRow).access_token;
    let refreshToken = (tokenRow as FitbitTokenRow).refresh_token;
    const expiresAt = (tokenRow as FitbitTokenRow).expires_at;

    const isExpired =
      expiresAt !== null && new Date(expiresAt).getTime() <= Date.now() + 60000;

    if (isExpired) {
      if (!refreshToken) {
        return jsonResponse(
          { error: "Fitbit refresh token missing. Reconnect Fitbit." },
          400
        );
      }

      const refreshed = await refreshFitbitToken({
        clientId: fitbitClientId,
        clientSecret: fitbitClientSecret,
        refreshToken,
      });

      accessToken = String(refreshed.access_token || "");
      refreshToken = String(refreshed.refresh_token || refreshToken);
      const nextExpiresIn = Number(refreshed.expires_in || 0);
      const nextExpiresAt =
        nextExpiresIn > 0
          ? new Date(Date.now() + nextExpiresIn * 1000).toISOString()
          : null;
      const nextScope =
        typeof refreshed.scope === "string"
          ? refreshed.scope.split(" ").filter(Boolean)
          : [];

      await admin
        .from("health_integration_tokens")
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: refreshed.token_type
            ? String(refreshed.token_type)
            : null,
          expires_at: nextExpiresAt,
          scope: nextScope,
          metadata: { updated_via: "refresh_token_flow" },
        })
        .eq("user_id", user.id)
        .eq("provider", "fitbit");
    }

    const dates = getDateRange(days);
    const entries: Array<Record<string, unknown>> = [];
    let processedDays = 0;
    let rateLimited = false;
    let retryAfterSeconds: number | null = null;

    for (const date of dates) {
      let activity: Record<string, unknown> | null = null;
      let sleep: Record<string, unknown> | null = null;
      let heart: Record<string, unknown> | null = null;
      let weight: Record<string, unknown> | null = null;
      let water: Record<string, unknown> | null = null;

      try {
        [activity, sleep, heart, weight, water] = await Promise.all([
          fetchFitbitJson(
            `/1/user/-/activities/date/${date}.json`,
            accessToken
          ),
          fetchFitbitJson(`/1.2/user/-/sleep/date/${date}.json`, accessToken),
          fetchFitbitJson(
            `/1/user/-/activities/heart/date/${date}/1d.json`,
            accessToken
          ),
          fetchFitbitJson(
            `/1/user/-/body/log/weight/date/${date}.json`,
            accessToken
          ),
          fetchFitbitJson(
            `/1/user/-/foods/log/water/date/${date}.json`,
            accessToken
          ),
        ]);
      } catch (error) {
        if (error instanceof FitbitApiError && error.status === 429) {
          rateLimited = true;
          retryAfterSeconds = error.retryAfterSeconds;
          break;
        }
        throw error;
      }

      const activitySummary = (activity?.summary ?? {}) as Record<
        string,
        unknown
      >;
      const steps = Number(activitySummary.steps ?? 0) || null;
      const calories = Number(activitySummary.caloriesOut ?? 0) || null;

      const sleepSummary = (sleep?.summary ?? {}) as Record<string, unknown>;
      const totalMinutesAsleep =
        Number(sleepSummary.totalMinutesAsleep ?? 0) || 0;
      const sleepHours =
        totalMinutesAsleep > 0
          ? Number((totalMinutesAsleep / 60).toFixed(2))
          : null;

      const heartActivities = (heart?.["activities-heart"] ?? []) as Array<
        Record<string, unknown>
      >;
      const restingHeartRate =
        heartActivities.length > 0
          ? Number(
              (heartActivities[0].value as Record<string, unknown> | undefined)
                ?.restingHeartRate ?? 0
            ) || null
          : null;

      const weightItems = (weight?.weight ?? []) as Array<
        Record<string, unknown>
      >;
      const weightKg =
        weightItems.length > 0
          ? Number(weightItems[0].weight ?? 0) || null
          : null;

      const waterSummary = (water?.summary ?? {}) as Record<string, unknown>;
      const waterMl = Number(waterSummary.water ?? 0) || null;

      if (
        steps === null &&
        calories === null &&
        sleepHours === null &&
        restingHeartRate === null &&
        weightKg === null &&
        waterMl === null
      ) {
        processedDays += 1;
        await new Promise((resolve) => setTimeout(resolve, 220));
        continue;
      }

      entries.push({
        user_id: user.id,
        recorded_for: date,
        source: "integration",
        steps,
        calories,
        sleep_hours: sleepHours,
        resting_heart_rate: restingHeartRate,
        weight_kg: weightKg,
        water_ml: waterMl,
        metadata: {
          provider: "fitbit",
          imported_at: new Date().toISOString(),
        },
      });

      processedDays += 1;
      await new Promise((resolve) => setTimeout(resolve, 220));
    }

    if (entries.length > 0) {
      const { error: upsertError } = await admin
        .from("health_metric_entries")
        .upsert(entries, {
          onConflict: "user_id,recorded_for,source",
        });

      if (upsertError) {
        return jsonResponse(
          {
            error: "Failed to upsert health entries",
            details: upsertError.message,
          },
          500
        );
      }
    }

    await admin
      .from("health_integrations")
      .update({
        status: "connected",
        last_sync_at: new Date().toISOString(),
        metadata: {
          provider: "fitbit",
          last_import_count: entries.length,
          last_import_days: days,
          processed_days: processedDays,
          rate_limited: rateLimited,
          retry_after_seconds: retryAfterSeconds,
        },
      })
      .eq("user_id", user.id)
      .eq("provider", "fitbit");

    return jsonResponse({
      ok: true,
      imported_entries: entries.length,
      days_requested: days,
      processed_days: processedDays,
      rate_limited: rateLimited,
      retry_after_seconds: retryAfterSeconds,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
