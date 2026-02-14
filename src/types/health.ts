export type HealthMetricSource = "manual" | "integration" | "browser";

export type HealthIntegrationProvider =
  | "apple_health"
  | "health_connect"
  | "fitbit"
  | "garmin"
  | "oura"
  | "withings"
  | "polar"
  | "whoop";

export type HealthIntegrationStatus =
  | "not_connected"
  | "pending"
  | "connected"
  | "error"
  | "revoked";

export interface HealthMetricEntry {
  id: string;
  user_id: string;
  recorded_for: string;
  source: HealthMetricSource;
  steps: number | null;
  sleep_hours: number | null;
  water_ml: number | null;
  weight_kg: number | null;
  resting_heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  calories: number | null;
  mood_score: number | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HealthMetricEntryInput {
  recorded_for: string;
  source?: HealthMetricSource;
  steps?: number | null;
  sleep_hours?: number | null;
  water_ml?: number | null;
  weight_kg?: number | null;
  resting_heart_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  calories?: number | null;
  mood_score?: number | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
}

export interface HealthIntegrationRecord {
  id: string;
  user_id: string;
  provider: HealthIntegrationProvider;
  status: Exclude<HealthIntegrationStatus, "not_connected">;
  access_scope: string[];
  metadata: Record<string, unknown>;
  last_sync_at: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthIntegrationCatalogItem {
  provider: HealthIntegrationProvider;
  name: string;
  shortDescription: string;
  syncMethod: "oauth_api" | "mobile_bridge" | "browser_sensor";
  badge: string;
}

export interface HealthIntegrationView extends HealthIntegrationCatalogItem {
  status: HealthIntegrationStatus;
  last_sync_at: string | null;
  connected_at: string | null;
}
