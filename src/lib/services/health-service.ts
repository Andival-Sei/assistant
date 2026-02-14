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
    provider: "apple_health",
    name: "Apple Health",
    shortDescription: "Сон, пульс, активность через iOS bridge",
    syncMethod: "mobile_bridge",
    badge: "iOS",
  },
  {
    provider: "health_connect",
    name: "Health Connect",
    shortDescription: "Единый источник данных Android",
    syncMethod: "mobile_bridge",
    badge: "Android",
  },
  {
    provider: "fitbit",
    name: "Fitbit",
    shortDescription: "Шаги, тренировки, сон через OAuth API",
    syncMethod: "oauth_api",
    badge: "Wearable",
  },
  {
    provider: "garmin",
    name: "Garmin",
    shortDescription: "Нагрузки, пульс и восстановление",
    syncMethod: "oauth_api",
    badge: "Wearable",
  },
  {
    provider: "oura",
    name: "Oura",
    shortDescription: "Сон и readiness score",
    syncMethod: "oauth_api",
    badge: "Ring",
  },
  {
    provider: "withings",
    name: "Withings",
    shortDescription: "Вес, давление и body metrics",
    syncMethod: "oauth_api",
    badge: "Scale",
  },
  {
    provider: "polar",
    name: "Polar",
    shortDescription: "Тренировки и кардио-нагрузка",
    syncMethod: "oauth_api",
    badge: "Sport",
  },
  {
    provider: "whoop",
    name: "WHOOP",
    shortDescription: "Recovery, strain и сон",
    syncMethod: "oauth_api",
    badge: "Recovery",
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
      water_ml: toNullableNumber(input.water_ml),
      weight_kg: toNullableNumber(input.weight_kg),
      resting_heart_rate: toNullableNumber(input.resting_heart_rate),
      systolic_bp: toNullableNumber(input.systolic_bp),
      diastolic_bp: toNullableNumber(input.diastolic_bp),
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

  getIntegrationCatalog(): HealthIntegrationCatalogItem[] {
    return HEALTH_INTEGRATION_CATALOG;
  },
};
