import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GoogleTokenRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

type SyncRequest = {
  days?: number;
};

const GOOGLE_DATA_TYPES = [
  "com.google.step_count.delta",
  "com.google.calories.expended",
  "com.google.heart_rate.bpm",
  "com.google.weight",
  "com.google.hydration",
  "com.google.blood_pressure",
  "com.google.oxygen_saturation",
  "com.google.blood_glucose",
  "com.google.body.temperature",
  "com.google.sleep.segment",
  "com.google.reproductive_health",
] as const;

class GoogleApiError extends Error {
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

function toIntOrNull(value: number | null): number | null {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value))
    return null;
  return Math.round(value);
}

function toNumberOrNull(value: number | null, digits = 2): number | null {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value))
    return null;
  return Number(value.toFixed(digits));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDateRange(days: number): string[] {
  const safeDays = Math.min(Math.max(days, 1), 120);
  const out: string[] = [];
  const now = new Date();
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function parseForbiddenDataType(error: unknown): string | null {
  if (!(error instanceof GoogleApiError)) return null;
  if (error.status !== 403 && error.status !== 400) return null;
  const message = String(error.message);
  const match =
    message.match(/Cannot read data of type\s+([a-zA-Z0-9._]+)/i) ??
    message.match(/no default datasource found for:\s*([a-zA-Z0-9._]+)/i);
  return match?.[1] ?? null;
}

function toPointNumbers(point: {
  value?: Array<{
    intVal?: number;
    fpVal?: number;
    mapVal?: Array<{
      key?: string;
      value?: { intVal?: number; fpVal?: number };
    }>;
  }>;
}): number[] {
  const numbers: number[] = [];
  const values = point.value ?? [];
  for (const value of values) {
    if (typeof value.intVal === "number") numbers.push(value.intVal);
    if (typeof value.fpVal === "number") numbers.push(value.fpVal);
    const map = value.mapVal ?? [];
    for (const item of map) {
      if (typeof item.value?.intVal === "number")
        numbers.push(item.value.intVal);
      if (typeof item.value?.fpVal === "number") numbers.push(item.value.fpVal);
    }
  }
  return numbers;
}

function getPointDurationHours(point: {
  startTimeNanos?: string;
  endTimeNanos?: string;
  startTimeMillis?: string;
  endTimeMillis?: string;
}): number {
  const startNs = Number(point.startTimeNanos ?? 0);
  const endNs = Number(point.endTimeNanos ?? 0);
  if (Number.isFinite(startNs) && Number.isFinite(endNs) && endNs > startNs) {
    return (endNs - startNs) / 1_000_000_000 / 3600;
  }

  const startMs = Number(point.startTimeMillis ?? 0);
  const endMs = Number(point.endTimeMillis ?? 0);
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
    return (endMs - startMs) / 1000 / 3600;
  }

  return 0;
}

async function refreshGoogleToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Failed to refresh Google token: ${JSON.stringify(json)}`);
  }
  return json;
}

async function aggregateGoogleFitDay(
  accessToken: string,
  day: string,
  dataTypes: string[]
) {
  const start = new Date(`${day}T00:00:00.000Z`).getTime();
  const end = new Date(`${day}T23:59:59.999Z`).getTime();

  const payload = {
    aggregateBy: dataTypes.map((dataTypeName) => ({ dataTypeName })),
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start,
    endTimeMillis: end,
  };

  const response = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : null;
    throw new GoogleApiError(
      `Google Fit API error ${response.status}: ${text}`,
      response.status,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null
    );
  }

  const json = (await response.json()) as {
    bucket?: Array<{
      dataset?: Array<{
        dataSourceId?: string;
        point?: Array<{
          startTimeNanos?: string;
          endTimeNanos?: string;
          startTimeMillis?: string;
          endTimeMillis?: string;
          value?: Array<{
            intVal?: number;
            fpVal?: number;
            mapVal?: Array<{
              key?: string;
              value?: { intVal?: number; fpVal?: number };
            }>;
          }>;
        }>;
      }>;
    }>;
  };

  const bucket = json.bucket?.[0];
  const datasets = bucket?.dataset ?? [];

  let steps: number | null = null;
  let calories: number | null = null;
  let restingHeartRate: number | null = null;
  let weightKg: number | null = null;
  let waterMl: number | null = null;
  let systolicBp: number | null = null;
  let diastolicBp: number | null = null;
  let oxygenSaturationPct: number | null = null;
  let bodyTemperatureC: number | null = null;
  let bloodGlucoseMmolL: number | null = null;
  let sleepHours: number | null = null;
  let sleepDeepHours: number | null = null;
  let sleepLightHours: number | null = null;
  let sleepRemHours: number | null = null;
  let sleepAwakeHours: number | null = null;
  let reproductiveEventsCount: number | null = null;

  const heartValues: number[] = [];
  let sleepTotal = 0;
  let sleepDeep = 0;
  let sleepLight = 0;
  let sleepRem = 0;
  let sleepAwake = 0;
  let reproductiveCount = 0;

  for (const dataset of datasets) {
    const id = (dataset.dataSourceId || "").toLowerCase();
    const points = dataset.point ?? [];

    for (const point of points) {
      const values = toPointNumbers(point);

      if (id.includes("step_count")) {
        for (const v of values) if (v > 0) steps = (steps ?? 0) + v;
        continue;
      }

      if (id.includes("calories.expended")) {
        for (const v of values) if (v > 0) calories = (calories ?? 0) + v;
        continue;
      }

      if (id.includes("heart_rate")) {
        for (const v of values) if (v > 0) heartValues.push(v);
        continue;
      }

      if (id.includes("weight")) {
        const latest = values.find((v) => v > 0);
        if (typeof latest === "number") weightKg = latest;
        continue;
      }

      if (id.includes("hydration")) {
        for (const v of values) {
          if (v <= 0) continue;
          waterMl = (waterMl ?? 0) + v * 1000;
        }
        continue;
      }

      if (id.includes("blood_pressure")) {
        const [systolic, diastolic] = values;
        if (typeof systolic === "number" && systolic > 0) systolicBp = systolic;
        if (typeof diastolic === "number" && diastolic > 0)
          diastolicBp = diastolic;
        continue;
      }

      if (id.includes("oxygen_saturation")) {
        const v = values.find((x) => x > 0);
        if (typeof v === "number") {
          oxygenSaturationPct = v <= 1 ? v * 100 : v;
        }
        continue;
      }

      if (id.includes("body.temperature")) {
        const v = values.find((x) => x > 0);
        if (typeof v === "number") bodyTemperatureC = v;
        continue;
      }

      if (id.includes("blood_glucose")) {
        const v = values.find((x) => x > 0);
        if (typeof v === "number") {
          bloodGlucoseMmolL = v > 40 ? v / 18 : v;
        }
        continue;
      }

      if (id.includes("sleep.segment")) {
        const stage = Number(values[0] ?? 2);
        const durationHours = getPointDurationHours(point);
        if (durationHours <= 0) continue;

        if (stage === 4) {
          sleepLight += durationHours;
          sleepTotal += durationHours;
        } else if (stage === 5) {
          sleepDeep += durationHours;
          sleepTotal += durationHours;
        } else if (stage === 6) {
          sleepRem += durationHours;
          sleepTotal += durationHours;
        } else if (stage === 1 || stage === 3) {
          sleepAwake += durationHours;
        } else {
          sleepLight += durationHours;
          sleepTotal += durationHours;
        }
        continue;
      }

      if (id.includes("reproductive_health")) {
        reproductiveCount += 1;
      }
    }
  }

  if (heartValues.length > 0) {
    const avg =
      heartValues.reduce((sum, value) => sum + value, 0) / heartValues.length;
    restingHeartRate = Math.round(avg);
  }

  if (sleepTotal > 0) sleepHours = clamp(sleepTotal, 0, 24);
  if (sleepDeep > 0) sleepDeepHours = clamp(sleepDeep, 0, 24);
  if (sleepLight > 0) sleepLightHours = clamp(sleepLight, 0, 24);
  if (sleepRem > 0) sleepRemHours = clamp(sleepRem, 0, 24);
  if (sleepAwake > 0) sleepAwakeHours = clamp(sleepAwake, 0, 24);
  if (reproductiveCount > 0) reproductiveEventsCount = reproductiveCount;

  return {
    steps,
    calories,
    restingHeartRate,
    weightKg,
    waterMl,
    systolicBp,
    diastolicBp,
    oxygenSaturationPct,
    bodyTemperatureC,
    bloodGlucoseMmolL,
    sleepHours,
    sleepDeepHours,
    sleepLightHours,
    sleepRemHours,
    sleepAwakeHours,
    reproductiveEventsCount,
  };
}

async function fetchSleepHoursFromSessions(
  accessToken: string,
  day: string
): Promise<number | null> {
  const dayStart = new Date(`${day}T00:00:00.000Z`).getTime();
  const dayEnd = new Date(`${day}T23:59:59.999Z`).getTime();
  const startIso = new Date(dayStart).toISOString();
  const endIso = new Date(dayEnd).toISOString();
  const url = new URL(
    "https://www.googleapis.com/fitness/v1/users/me/sessions"
  );
  url.searchParams.set("startTime", startIso);
  url.searchParams.set("endTime", endIso);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : null;
    throw new GoogleApiError(
      `Google Fit sessions API error ${response.status}: ${text}`,
      response.status,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null
    );
  }

  const json = (await response.json()) as {
    session?: Array<{
      activityType?: number;
      startTimeMillis?: string;
      endTimeMillis?: string;
    }>;
  };

  const sessions = json.session ?? [];
  let totalHours = 0;
  for (const session of sessions) {
    // 72 = sleep
    if (session.activityType !== 72) continue;
    const start = Number(session.startTimeMillis ?? 0);
    const end = Number(session.endTimeMillis ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      continue;
    const overlapStart = Math.max(start, dayStart);
    const overlapEnd = Math.min(end, dayEnd);
    if (overlapEnd <= overlapStart) continue;
    totalHours += (overlapEnd - overlapStart) / 1000 / 3600;
  }

  if (totalHours <= 0) return null;
  return Number(clamp(totalHours, 0, 24).toFixed(2));
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
    const googleClientId = Deno.env.get("GOOGLE_FIT_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_FIT_CLIENT_SECRET");

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !googleClientId ||
      !googleClientSecret
    ) {
      return jsonResponse(
        { error: "Missing env vars for Google Fit sync function" },
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json().catch(() => ({}))) as SyncRequest;
    const { data: integrationRow } = await admin
      .from("health_integrations")
      .select("last_sync_at")
      .eq("user_id", user.id)
      .eq("provider", "google_fit")
      .maybeSingle();

    const requestedDays = body.days ?? null;
    const defaultDays = integrationRow?.last_sync_at ? 7 : 60;
    const days = Math.min(Math.max(requestedDays ?? defaultDays, 1), 120);

    const { data: tokenRow, error: tokenError } = await admin
      .from("health_integration_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .eq("provider", "google_fit")
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return jsonResponse(
        { error: "Google Fit token not found. Connect Google Fit first." },
        400
      );
    }

    let accessToken = (tokenRow as GoogleTokenRow).access_token;
    let refreshToken = (tokenRow as GoogleTokenRow).refresh_token;
    const expiresAt = (tokenRow as GoogleTokenRow).expires_at;

    const isExpired =
      expiresAt !== null && new Date(expiresAt).getTime() <= Date.now() + 60000;
    if (isExpired) {
      if (!refreshToken) {
        return jsonResponse(
          { error: "Google refresh token missing. Reconnect Google Fit." },
          400
        );
      }
      const refreshed = await refreshGoogleToken({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        refreshToken,
      });

      accessToken = String(refreshed.access_token || "");
      refreshToken = String(refreshed.refresh_token || refreshToken);
      const nextExpiresIn = Number(refreshed.expires_in || 0);
      const nextExpiresAt =
        nextExpiresIn > 0
          ? new Date(Date.now() + nextExpiresIn * 1000).toISOString()
          : null;

      await admin
        .from("health_integration_tokens")
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: refreshed.token_type
            ? String(refreshed.token_type)
            : null,
          expires_at: nextExpiresAt,
          metadata: { updated_via: "refresh_token_flow" },
        })
        .eq("user_id", user.id)
        .eq("provider", "google_fit");
    }

    const dates = getDateRange(days);
    const entries: Array<Record<string, unknown>> = [];
    const blockedTypes = new Set<string>();
    let processedDays = 0;
    let rateLimited = false;
    let retryAfterSeconds: number | null = null;

    for (const date of dates) {
      let requestedTypes = GOOGLE_DATA_TYPES.filter(
        (dataType) => !blockedTypes.has(dataType)
      ) as string[];

      if (requestedTypes.length === 0) {
        processedDays += 1;
        continue;
      }

      let dayData: Awaited<ReturnType<typeof aggregateGoogleFitDay>> | null =
        null;

      while (requestedTypes.length > 0) {
        try {
          dayData = await aggregateGoogleFitDay(
            accessToken,
            date,
            requestedTypes
          );
          break;
        } catch (error) {
          if (error instanceof GoogleApiError && error.status === 429) {
            rateLimited = true;
            retryAfterSeconds = error.retryAfterSeconds;
            requestedTypes = [];
            break;
          }

          const forbiddenType = parseForbiddenDataType(error);
          if (forbiddenType && requestedTypes.includes(forbiddenType)) {
            blockedTypes.add(forbiddenType);
            requestedTypes = requestedTypes.filter(
              (it) => it !== forbiddenType
            );
            continue;
          }

          throw error;
        }
      }

      if (rateLimited) break;
      if (!dayData) {
        processedDays += 1;
        await new Promise((resolve) => setTimeout(resolve, 180));
        continue;
      }

      const {
        steps,
        calories,
        restingHeartRate,
        weightKg,
        waterMl,
        systolicBp,
        diastolicBp,
        oxygenSaturationPct,
        bodyTemperatureC,
        bloodGlucoseMmolL,
        sleepHours,
        sleepDeepHours,
        sleepLightHours,
        sleepRemHours,
        sleepAwakeHours,
        reproductiveEventsCount,
      } = dayData;

      let finalSleepHours = sleepHours;
      if (finalSleepHours === null) {
        try {
          finalSleepHours = await fetchSleepHoursFromSessions(
            accessToken,
            date
          );
        } catch (error) {
          if (error instanceof GoogleApiError && error.status === 429) {
            rateLimited = true;
            retryAfterSeconds = error.retryAfterSeconds;
            break;
          }
          const forbiddenType = parseForbiddenDataType(error);
          if (forbiddenType) {
            blockedTypes.add(forbiddenType);
          } else if (
            error instanceof GoogleApiError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            // Non-fatal for day-level sleep fallback.
          } else {
            throw error;
          }
        }
      }

      if (finalSleepHours !== null) {
        finalSleepHours = clamp(finalSleepHours, 0, 24);
      }

      if (
        steps === null &&
        calories === null &&
        restingHeartRate === null &&
        weightKg === null &&
        waterMl === null &&
        systolicBp === null &&
        diastolicBp === null &&
        oxygenSaturationPct === null &&
        bodyTemperatureC === null &&
        bloodGlucoseMmolL === null &&
        finalSleepHours === null &&
        sleepDeepHours === null &&
        sleepLightHours === null &&
        sleepRemHours === null &&
        sleepAwakeHours === null &&
        reproductiveEventsCount === null
      ) {
        processedDays += 1;
        await new Promise((resolve) => setTimeout(resolve, 180));
        continue;
      }

      entries.push({
        user_id: user.id,
        recorded_for: date,
        source: "integration",
        steps: toIntOrNull(steps),
        calories: toIntOrNull(calories),
        resting_heart_rate: toIntOrNull(restingHeartRate),
        weight_kg: toNumberOrNull(weightKg),
        water_ml: toIntOrNull(waterMl),
        systolic_bp: toIntOrNull(systolicBp),
        diastolic_bp: toIntOrNull(diastolicBp),
        oxygen_saturation_pct: toNumberOrNull(oxygenSaturationPct),
        body_temperature_c: toNumberOrNull(bodyTemperatureC),
        blood_glucose_mmol_l: toNumberOrNull(bloodGlucoseMmolL),
        sleep_hours: toNumberOrNull(finalSleepHours),
        sleep_deep_hours: toNumberOrNull(sleepDeepHours),
        sleep_light_hours: toNumberOrNull(sleepLightHours),
        sleep_rem_hours: toNumberOrNull(sleepRemHours),
        sleep_awake_hours: toNumberOrNull(sleepAwakeHours),
        reproductive_events_count: toIntOrNull(reproductiveEventsCount),
        metadata: {
          provider: "google_fit",
          imported_at: new Date().toISOString(),
        },
      });

      processedDays += 1;
      await new Promise((resolve) => setTimeout(resolve, 180));
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
          provider: "google_fit",
          last_import_count: entries.length,
          last_import_days: days,
          processed_days: processedDays,
          rate_limited: rateLimited,
          retry_after_seconds: retryAfterSeconds,
          blocked_data_types: Array.from(blockedTypes),
        },
      })
      .eq("user_id", user.id)
      .eq("provider", "google_fit");

    return jsonResponse({
      ok: true,
      imported_entries: entries.length,
      days_requested: days,
      processed_days: processedDays,
      rate_limited: rateLimited,
      retry_after_seconds: retryAfterSeconds,
      blocked_data_types: Array.from(blockedTypes),
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
