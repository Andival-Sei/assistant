import { supabaseClient } from "@/lib/db/supabase-client";
import type {
  HealthMetricEntry,
  HealthMetricEntryInput,
  HealthIntegrationCatalogItem,
  HealthIntegrationRecord,
  HealthIntegrationProvider,
  HealthIntegrationStatus,
  HealthIntegrationView,
} from "@/types/health";

const HEALTH_INTEGRATION_CATALOG: HealthIntegrationCatalogItem[] = [
  {
    provider: "health_connect",
    name: "Health Connect",
    shortDescription:
      "В разработке: Android-bridge для синхронизации из Mi Fitness/Zepp Life",
    syncMethod: "mobile_bridge",
    badge: "Android",
  },
  {
    provider: "google_fit",
    name: "Google Fit",
    shortDescription:
      "Шаги, сон, давление, SpO2, температура, глюкоза через Google OAuth API",
    syncMethod: "oauth_api",
    badge: "Google",
  },
  {
    provider: "fitbit",
    name: "Fitbit",
    shortDescription: "Шаги, тренировки, сон через OAuth API",
    syncMethod: "oauth_api",
    badge: "Wearable",
  },
];

function toNullableNumber(value: number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (Number.isNaN(value)) return null;
  return value;
}

export const healthService = {
  async getMetrics(days = 30): Promise<HealthMetricEntry[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Math.max(days - 1, 0));
    const dateString = fromDate.toISOString().slice(0, 10);

    const { data, error } = await supabaseClient
      .from("health_metric_entries")
      .select("*")
      .gte("recorded_for", dateString)
      .order("recorded_for", { ascending: false });

    if (error) throw error;
    return (data || []) as HealthMetricEntry[];
  },

  async upsertMetricEntry(
    input: HealthMetricEntryInput
  ): Promise<HealthMetricEntry> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const payload = {
      user_id: user.id,
      recorded_for: input.recorded_for,
      source: input.source ?? "manual",
      steps: toNullableNumber(input.steps),
      sleep_hours: toNullableNumber(input.sleep_hours),
      sleep_deep_hours: toNullableNumber(input.sleep_deep_hours),
      sleep_light_hours: toNullableNumber(input.sleep_light_hours),
      sleep_rem_hours: toNullableNumber(input.sleep_rem_hours),
      sleep_awake_hours: toNullableNumber(input.sleep_awake_hours),
      water_ml: toNullableNumber(input.water_ml),
      weight_kg: toNullableNumber(input.weight_kg),
      resting_heart_rate: toNullableNumber(input.resting_heart_rate),
      systolic_bp: toNullableNumber(input.systolic_bp),
      diastolic_bp: toNullableNumber(input.diastolic_bp),
      oxygen_saturation_pct: toNullableNumber(input.oxygen_saturation_pct),
      body_temperature_c: toNullableNumber(input.body_temperature_c),
      blood_glucose_mmol_l: toNullableNumber(input.blood_glucose_mmol_l),
      reproductive_events_count: toNullableNumber(
        input.reproductive_events_count
      ),
      calories: toNullableNumber(input.calories),
      mood_score: toNullableNumber(input.mood_score),
      note: input.note?.trim() || null,
      metadata: input.metadata ?? {},
    };

    const { data, error } = await supabaseClient
      .from("health_metric_entries")
      .upsert(payload, {
        onConflict: "user_id,recorded_for,source",
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as HealthMetricEntry;
  },

  async getIntegrations(): Promise<HealthIntegrationView[]> {
    const { data, error } = await supabaseClient
      .from("health_integrations")
      .select("*");

    if (error) throw error;
    const rows = (data || []) as HealthIntegrationRecord[];

    const byProvider = new Map<
      HealthIntegrationProvider,
      HealthIntegrationRecord
    >();
    rows.forEach((row) => byProvider.set(row.provider, row));

    return HEALTH_INTEGRATION_CATALOG.map((catalogItem) => {
      const row = byProvider.get(catalogItem.provider);
      return {
        ...catalogItem,
        status: (row?.status ?? "not_connected") as HealthIntegrationStatus,
        connected_at: row?.connected_at ?? null,
        last_sync_at: row?.last_sync_at ?? null,
      };
    });
  },

  async requestIntegration(provider: HealthIntegrationProvider): Promise<void> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const { error } = await supabaseClient.from("health_integrations").upsert(
      {
        user_id: user.id,
        provider,
        status: "pending",
        connected_at: null,
      },
      { onConflict: "user_id,provider" }
    );

    if (error) throw error;
  },

  async startOAuthIntegration(
    provider: HealthIntegrationProvider,
    returnTo?: string
  ): Promise<string> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const { data, error } = await supabaseClient.functions.invoke(
      "health-oauth-start",
      {
        body: {
          provider,
          return_to: returnTo,
        },
      }
    );

    if (error) {
      throw new Error(error.message || "Не удалось запустить OAuth-поток");
    }

    const authorizeUrl = (data as { authorize_url?: string })?.authorize_url;
    if (!authorizeUrl) {
      throw new Error("OAuth URL не был получен");
    }

    return authorizeUrl;
  },

  async syncFitbit(days?: number): Promise<{
    imported_entries: number;
    processed_days: number;
    rate_limited: boolean;
    retry_after_seconds: number | null;
  }> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const { data, error } = await supabaseClient.functions.invoke(
      "health-fitbit-sync",
      {
        body: days ? { days } : {},
      }
    );

    if (error) {
      throw new Error(error.message || "Не удалось синхронизировать Fitbit");
    }

    return data as {
      imported_entries: number;
      processed_days: number;
      rate_limited: boolean;
      retry_after_seconds: number | null;
    };
  },

  async syncGoogleFit(days?: number): Promise<{
    imported_entries: number;
    processed_days: number;
    rate_limited: boolean;
    retry_after_seconds: number | null;
  }> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const { data, error } = await supabaseClient.functions.invoke(
      "health-google-fit-sync",
      {
        body: days ? { days } : {},
      }
    );

    if (error) {
      throw new Error(
        error.message || "Не удалось синхронизировать Google Fit"
      );
    }

    return data as {
      imported_entries: number;
      processed_days: number;
      rate_limited: boolean;
      retry_after_seconds: number | null;
    };
  },

  async autoSyncConnectedIntegrations(): Promise<void> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) return;

    const integrations = await this.getIntegrations();
    const fitbit = integrations.find((item) => item.provider === "fitbit");
    const googleFit = integrations.find(
      (item) => item.provider === "google_fit"
    );

    const cooldownMs = 1000 * 60 * 30;
    const key = `health:auto-sync:${user.id}`;
    const lastRunAt = Number(localStorage.getItem(key) || "0");
    if (Date.now() - lastRunAt < cooldownMs) return;

    localStorage.setItem(key, String(Date.now()));
    if (fitbit?.status === "connected") {
      await this.syncFitbit();
    }
    if (googleFit?.status === "connected") {
      await this.syncGoogleFit();
    }
  },

  getIntegrationCatalog(): HealthIntegrationCatalogItem[] {
    return HEALTH_INTEGRATION_CATALOG;
  },
};
