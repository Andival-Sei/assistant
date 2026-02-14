import type { HealthIntegrationView, HealthMetricEntry } from "@/types/health";
import type { Dispatch, FormEvent, SetStateAction } from "react";

export type HealthFormState = {
  weight_kg: string;
  steps: string;
  sleep_hours: string;
  sleep_deep_hours: string;
  sleep_light_hours: string;
  sleep_rem_hours: string;
  sleep_awake_hours: string;
  water_ml: string;
  resting_heart_rate: string;
  systolic_bp: string;
  diastolic_bp: string;
  oxygen_saturation_pct: string;
  body_temperature_c: string;
  blood_glucose_mmol_l: string;
  reproductive_events_count: string;
  mood_score: string;
  note: string;
};

export type WeeklyStats = {
  avgSteps: number | null;
  avgSleep: number | null;
  avgPulse: number | null;
  avgWater: number | null;
  avgSpo2: number | null;
  avgTemperature: number | null;
};

export type HealthTabBaseProps = {
  integrations: HealthIntegrationView[];
  connectedSyncIntegration?: HealthIntegrationView;
};

export type HealthOverviewTabProps = HealthTabBaseProps & {
  metricsCount: number;
  weeklyStats: WeeklyStats;
  todayEntry?: HealthMetricEntry;
  onSyncFitbit: (days?: number) => void;
  isSyncPending: boolean;
};

export type HealthManualTabProps = {
  form: HealthFormState;
  setForm: Dispatch<SetStateAction<HealthFormState>>;
  onSave: (event: FormEvent) => void;
  isSaving: boolean;
  today: string;
};

export type HealthIntegrationsTabProps = HealthTabBaseProps & {
  connectingProvider: string | null;
  isRequestPending: boolean;
  onConnectProvider: (item: HealthIntegrationView) => Promise<void>;
};

export type HealthHistoryTabProps = HealthTabBaseProps & {
  entries: HealthMetricEntry[];
};

export type HealthAnalyticsTabProps = HealthTabBaseProps & {
  entries: HealthMetricEntry[];
};
