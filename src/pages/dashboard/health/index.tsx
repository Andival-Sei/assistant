import { useEffect, useMemo, useRef, useState } from "react";
import { FadeIn } from "@/components/motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { healthService } from "@/lib/services/health-service";
import type {
  HealthMetricEntryInput,
  HealthIntegrationView,
} from "@/types/health";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { HealthFormState, WeeklyStats } from "./health-types";
import { HealthOverviewTab } from "./tabs/overview-tab";
import { HealthIntegrationsTab } from "./tabs/integrations-tab";
import { HealthManualTab } from "./tabs/manual-tab";
import { HealthHistoryTab } from "./tabs/history-tab";
import { HealthAnalyticsTab } from "./tabs/analytics-tab";

const tabs = [
  { id: "overview", label: "Обзор", path: "/dashboard/health" },
  { id: "manual", label: "Журнал", path: "/dashboard/health/manual" },
  {
    id: "integrations",
    label: "Интеграции",
    path: "/dashboard/health/integrations",
  },
  { id: "analytics", label: "Аналитика", path: "/dashboard/health/analytics" },
  { id: "history", label: "История", path: "/dashboard/health/history" },
];

const initialFormState: HealthFormState = {
  weight_kg: "",
  steps: "",
  sleep_hours: "",
  sleep_deep_hours: "",
  sleep_light_hours: "",
  sleep_rem_hours: "",
  sleep_awake_hours: "",
  water_ml: "",
  resting_heart_rate: "",
  systolic_bp: "",
  diastolic_bp: "",
  oxygen_saturation_pct: "",
  body_temperature_c: "",
  blood_glucose_mmol_l: "",
  reproductive_events_count: "",
  mood_score: "",
  note: "",
};

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function HealthPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const handledOAuthRef = useRef<string | null>(null);
  const [form, setForm] = useState<HealthFormState>(initialFormState);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );
  const today = new Date().toISOString().slice(0, 10);

  const activeTab = useMemo(() => {
    const path = location.pathname;
    const matchedTab = [...tabs].reverse().find((t) => path.startsWith(t.path));
    return matchedTab?.id || "overview";
  }, [location.pathname]);

  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["health", "metrics"],
    queryFn: () => healthService.getMetrics(90),
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["health", "integrations"],
    queryFn: healthService.getIntegrations,
  });

  const saveMetricMutation = useMutation({
    mutationFn: (input: HealthMetricEntryInput) =>
      healthService.upsertMetricEntry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "metrics"] });
      toast.success("Запись здоровья сохранена");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Не удалось сохранить запись");
    },
  });

  const requestIntegrationMutation = useMutation({
    mutationFn: healthService.requestIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "integrations"] });
      toast.success("Запрос на интеграцию создан");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Не удалось сохранить запрос");
    },
  });

  const syncFitbitMutation = useMutation({
    mutationFn: (days?: number) => healthService.syncFitbit(days),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["health", "metrics"] });
      queryClient.invalidateQueries({ queryKey: ["health", "integrations"] });
      if (result.rate_limited) {
        toast.info(
          `Частичный импорт: ${result.imported_entries}. Лимит Fitbit, повторите позже.`
        );
        return;
      }
      toast.success(
        `Синхронизация завершена. Импорт: ${result.imported_entries}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Не удалось синхронизировать Fitbit");
    },
  });

  const syncGoogleFitMutation = useMutation({
    mutationFn: (days?: number) => healthService.syncGoogleFit(days),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["health", "metrics"] });
      queryClient.invalidateQueries({ queryKey: ["health", "integrations"] });
      if (result.rate_limited) {
        toast.info(
          `Частичный импорт: ${result.imported_entries}. Лимит Google, повторите позже.`
        );
        return;
      }
      toast.success(
        `Google Fit синхронизирован. Импорт: ${result.imported_entries}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Не удалось синхронизировать Google Fit");
    },
  });

  const latestByDay = useMemo(() => {
    const map = new Map<string, (typeof metrics)[number]>();
    metrics.forEach((item) => {
      const existing = map.get(item.recorded_for);
      if (!existing) {
        map.set(item.recorded_for, item);
        return;
      }

      // Prefer manual entry on the same day so user edits are visible.
      if (item.source === "manual" && existing.source !== "manual") {
        map.set(item.recorded_for, item);
      }
    });
    return Array.from(map.values());
  }, [metrics]);

  const weeklyStats = useMemo<WeeklyStats>(() => {
    const lastWeek = latestByDay.slice(0, 7);
    const avg = (values: Array<number | null | undefined>) => {
      const numbers = values.filter((v): v is number => typeof v === "number");
      if (numbers.length === 0) return null;
      return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    };

    return {
      avgSteps: avg(lastWeek.map((m) => m.steps)),
      avgSleep: avg(lastWeek.map((m) => m.sleep_hours)),
      avgPulse: avg(lastWeek.map((m) => m.resting_heart_rate)),
      avgWater: avg(lastWeek.map((m) => m.water_ml)),
      avgSpo2: avg(lastWeek.map((m) => m.oxygen_saturation_pct)),
      avgTemperature: avg(lastWeek.map((m) => m.body_temperature_c)),
    };
  }, [latestByDay]);

  const todayEntry = useMemo(
    () => latestByDay.find((item) => item.recorded_for === today),
    [latestByDay, today]
  );

  const fitbitIntegration = useMemo(
    () => integrations.find((item) => item.provider === "fitbit"),
    [integrations]
  );
  const googleFitIntegration = useMemo(
    () => integrations.find((item) => item.provider === "google_fit"),
    [integrations]
  );
  const connectedSyncIntegration = useMemo(() => {
    const connected = integrations.filter(
      (item) => item.status === "connected"
    );
    if (connected.length === 0) return undefined;
    return connected.slice().sort((a, b) => {
      const aTime = a.last_sync_at ? new Date(a.last_sync_at).getTime() : 0;
      const bTime = b.last_sync_at ? new Date(b.last_sync_at).getTime() : 0;
      return bTime - aTime;
    })[0];
  }, [integrations]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthStatus = url.searchParams.get("health_oauth");
    const provider = url.searchParams.get("provider");
    const reason = url.searchParams.get("reason");
    if (!oauthStatus) return;

    const oauthKey = `${oauthStatus}:${provider ?? ""}:${reason ?? ""}`;
    if (handledOAuthRef.current === oauthKey) return;
    handledOAuthRef.current = oauthKey;

    url.searchParams.delete("health_oauth");
    url.searchParams.delete("provider");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());

    if (oauthStatus === "success") {
      toast.success(`Интеграция ${provider || ""} успешно подключена`);
      queryClient.invalidateQueries({ queryKey: ["health", "integrations"] });

      if (provider === "google_fit") {
        void syncGoogleFitMutation.mutateAsync(undefined);
      } else {
        void syncFitbitMutation.mutateAsync(undefined);
      }
    } else if (oauthStatus === "error") {
      toast.error(
        `Не удалось подключить ${provider || "интеграцию"}${reason ? ` (${reason})` : ""}`
      );
    }
  }, [queryClient, syncFitbitMutation, syncGoogleFitMutation]);

  const handleSyncConnected = (days?: number) => {
    if (googleFitIntegration?.status === "connected") {
      syncGoogleFitMutation.mutate(days);
      return;
    }
    if (fitbitIntegration?.status === "connected") {
      syncFitbitMutation.mutate(days);
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveMetricMutation.mutate({
      recorded_for: today,
      source: "manual",
      weight_kg: parseNumber(form.weight_kg),
      steps: parseNumber(form.steps),
      sleep_hours: parseNumber(form.sleep_hours),
      sleep_deep_hours: parseNumber(form.sleep_deep_hours),
      sleep_light_hours: parseNumber(form.sleep_light_hours),
      sleep_rem_hours: parseNumber(form.sleep_rem_hours),
      sleep_awake_hours: parseNumber(form.sleep_awake_hours),
      water_ml: parseNumber(form.water_ml),
      resting_heart_rate: parseNumber(form.resting_heart_rate),
      systolic_bp: parseNumber(form.systolic_bp),
      diastolic_bp: parseNumber(form.diastolic_bp),
      oxygen_saturation_pct: parseNumber(form.oxygen_saturation_pct),
      body_temperature_c: parseNumber(form.body_temperature_c),
      blood_glucose_mmol_l: parseNumber(form.blood_glucose_mmol_l),
      reproductive_events_count: parseNumber(form.reproductive_events_count),
      mood_score: parseNumber(form.mood_score),
      note: form.note || null,
    });
  };

  const handleConnectProvider = async (item: HealthIntegrationView) => {
    setConnectingProvider(item.provider);
    try {
      if (item.provider === "health_connect") {
        toast.info(
          "Health Connect пока в разработке. Для текущего релиза используйте Google Fit / Fitbit."
        );
        return;
      }

      if (item.syncMethod === "oauth_api") {
        if (item.provider !== "fitbit" && item.provider !== "google_fit") {
          throw new Error(
            "Этот провайдер будет добавлен следующим этапом. Сейчас доступен Fitbit."
          );
        }

        const returnTo = `${window.location.origin}/dashboard/health`;
        const authorizeUrl = await healthService.startOAuthIntegration(
          item.provider,
          returnTo
        );
        window.location.href = authorizeUrl;
        return;
      }

      await requestIntegrationMutation.mutateAsync(item.provider);
    } finally {
      setConnectingProvider(null);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <FadeIn direction="up" distance={12}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Здоровье
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Автосинхронизация с интеграциями + ручной журнал и история метрик.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
            {metricsLoading
              ? "Обновляем данные..."
              : `Записей за 90 дней: ${metrics.length}`}
          </div>
        </div>
      </FadeIn>

      <div className="border-b border-border">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide sm:gap-8">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "pb-4 text-sm font-medium transition-colors relative whitespace-nowrap shrink-0",
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="healthActiveTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative min-h-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full"
          >
            <Routes location={location}>
              <Route
                index
                element={
                  <HealthOverviewTab
                    metricsCount={metrics.length}
                    weeklyStats={weeklyStats}
                    connectedSyncIntegration={connectedSyncIntegration}
                    integrations={integrations}
                    todayEntry={todayEntry}
                    onSyncFitbit={handleSyncConnected}
                    isSyncPending={
                      syncFitbitMutation.isPending ||
                      syncGoogleFitMutation.isPending
                    }
                  />
                }
              />
              <Route
                path="overview"
                element={<Navigate to="/dashboard/health" replace />}
              />
              <Route
                path="manual"
                element={
                  <HealthManualTab
                    form={form}
                    setForm={setForm}
                    onSave={handleSave}
                    isSaving={saveMetricMutation.isPending}
                    today={today}
                  />
                }
              />
              <Route
                path="integrations"
                element={
                  <HealthIntegrationsTab
                    integrations={integrations}
                    connectedSyncIntegration={connectedSyncIntegration}
                    connectingProvider={connectingProvider}
                    isRequestPending={requestIntegrationMutation.isPending}
                    onConnectProvider={handleConnectProvider}
                  />
                }
              />
              <Route
                path="analytics"
                element={
                  <HealthAnalyticsTab
                    entries={latestByDay}
                    integrations={integrations}
                    connectedSyncIntegration={connectedSyncIntegration}
                  />
                }
              />
              <Route
                path="history"
                element={
                  <HealthHistoryTab
                    entries={latestByDay}
                    integrations={integrations}
                    connectedSyncIntegration={connectedSyncIntegration}
                  />
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
