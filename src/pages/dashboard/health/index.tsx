import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/components/motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { healthService } from "@/lib/services/health-service";
import type {
  HealthMetricEntryInput,
  HealthIntegrationView,
} from "@/types/health";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity,
  HeartPulse,
  Moon,
  Droplets,
  Footprints,
  Link as LinkIcon,
  Smartphone,
  Globe,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

type FormState = {
  weight_kg: string;
  steps: string;
  sleep_hours: string;
  water_ml: string;
  resting_heart_rate: string;
  systolic_bp: string;
  diastolic_bp: string;
  mood_score: string;
  note: string;
};

const initialFormState: FormState = {
  weight_kg: "",
  steps: "",
  sleep_hours: "",
  water_ml: "",
  resting_heart_rate: "",
  systolic_bp: "",
  diastolic_bp: "",
  mood_score: "",
  note: "",
};

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function statusLabel(status: HealthIntegrationView["status"]): string {
  if (status === "connected") return "Подключено";
  if (status === "pending") return "Ожидает подключения";
  if (status === "error") return "Ошибка";
  if (status === "revoked") return "Отключено";
  return "Не подключено";
}

function methodLabel(method: HealthIntegrationView["syncMethod"]): string {
  if (method === "oauth_api") return "OAuth API";
  if (method === "mobile_bridge") return "Mobile bridge";
  return "Browser API";
}

export function HealthPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );
  const today = new Date().toISOString().slice(0, 10);

  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["health", "metrics"],
    queryFn: () => healthService.getMetrics(60),
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

  const latestByDay = useMemo(() => {
    const map = new Map<string, (typeof metrics)[number]>();
    metrics.forEach((item) => {
      if (!map.has(item.recorded_for)) map.set(item.recorded_for, item);
    });
    return Array.from(map.values());
  }, [metrics]);

  const weeklyStats = useMemo(() => {
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
    };
  }, [latestByDay]);

  const todayEntry = useMemo(
    () => latestByDay.find((item) => item.recorded_for === today),
    [latestByDay, today]
  );

  const browserCapabilities = useMemo(() => {
    if (typeof window === "undefined") {
      return { bluetooth: false, usb: false, geolocation: false };
    }
    return {
      bluetooth: "bluetooth" in navigator,
      usb: "usb" in navigator,
      geolocation: "geolocation" in navigator,
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthStatus = url.searchParams.get("health_oauth");
    const provider = url.searchParams.get("provider");
    const reason = url.searchParams.get("reason");
    if (!oauthStatus) return;

    if (oauthStatus === "success") {
      toast.success(`Интеграция ${provider || ""} успешно подключена`);
      queryClient.invalidateQueries({ queryKey: ["health", "integrations"] });
    } else if (oauthStatus === "error") {
      toast.error(
        `Не удалось подключить ${provider || "интеграцию"}${reason ? ` (${reason})` : ""}`
      );
    }

    url.searchParams.delete("health_oauth");
    url.searchParams.delete("provider");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
  }, [queryClient]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveMetricMutation.mutate({
      recorded_for: today,
      source: "manual",
      weight_kg: parseNumber(form.weight_kg),
      steps: parseNumber(form.steps),
      sleep_hours: parseNumber(form.sleep_hours),
      water_ml: parseNumber(form.water_ml),
      resting_heart_rate: parseNumber(form.resting_heart_rate),
      systolic_bp: parseNumber(form.systolic_bp),
      diastolic_bp: parseNumber(form.diastolic_bp),
      mood_score: parseNumber(form.mood_score),
      note: form.note || null,
    });
  };

  const handleConnectProvider = async (item: HealthIntegrationView) => {
    setConnectingProvider(item.provider);
    try {
      if (item.syncMethod === "oauth_api") {
        if (item.provider !== "fitbit") {
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
              Центр здоровья с гибридной стратегией: ручной ввод сейчас, плюс
              подключение wearables и мобильных источников через интеграции.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
            {metricsLoading
              ? "Обновляем данные..."
              : `Записей за 60 дней: ${metrics.length}`}
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FadeIn delay={0.05} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Footprints className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Шаги / 7д
              </span>
            </div>
            <div className="text-2xl font-bold">
              {weeklyStats.avgSteps
                ? Math.round(weeklyStats.avgSteps).toLocaleString("ru-RU")
                : "—"}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
                <Moon className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Сон / 7д
              </span>
            </div>
            <div className="text-2xl font-bold">
              {weeklyStats.avgSleep
                ? `${weeklyStats.avgSleep.toFixed(1)} ч`
                : "—"}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600">
                <HeartPulse className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Пульс / 7д
              </span>
            </div>
            <div className="text-2xl font-bold">
              {weeklyStats.avgPulse
                ? `${Math.round(weeklyStats.avgPulse)} уд/мин`
                : "—"}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-600">
                <Droplets className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Вода / 7д
              </span>
            </div>
            <div className="text-2xl font-bold">
              {weeklyStats.avgWater
                ? `${Math.round(weeklyStats.avgWater)} мл`
                : "—"}
            </div>
          </div>
        </FadeIn>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <FadeIn delay={0.25} direction="up" distance={14}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Интеграции</h2>
                <p className="text-sm text-muted-foreground">
                  Один экран для подключения носимых устройств и health APIs.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
                MVP
              </span>
            </div>

            <div className="space-y-3">
              {integrations.map((item) => (
                // OAuth в этом этапе включён только для Fitbit
                <div
                  key={item.provider}
                  className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.name}</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.shortDescription}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {methodLabel(item.syncMethod)} •{" "}
                      {statusLabel(item.status)}
                    </p>
                  </div>
                  <Button
                    variant={
                      item.status === "connected" ? "outline" : "default"
                    }
                    size="sm"
                    disabled={
                      requestIntegrationMutation.isPending ||
                      connectingProvider === item.provider ||
                      (item.syncMethod === "oauth_api" &&
                        item.provider !== "fitbit")
                    }
                    onClick={() =>
                      void handleConnectProvider(item).catch((error: Error) => {
                        toast.error(
                          error.message || "Не удалось запустить интеграцию"
                        );
                      })
                    }
                    className="sm:min-w-36"
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {connectingProvider === item.provider
                      ? "Подключаем..."
                      : item.syncMethod === "oauth_api" &&
                          item.provider !== "fitbit"
                        ? "Скоро"
                        : item.status === "connected"
                          ? "Переподключить"
                          : "Подключить"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/30 p-4 text-xs text-muted-foreground">
              Для браузера напрямую доступны только ограниченные сенсоры. Полный
              сбор health-данных делается через OAuth API или мобильный bridge.
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3} direction="up" distance={14}>
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl shadow-sm"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Ручной ввод</h2>
                <p className="text-sm text-muted-foreground">
                  Заполните значения за сегодня: мы сохраним и обновим
                  аналитику.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(today), "d MMMM yyyy", { locale: ru })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Вес, кг"
                value={form.weight_kg}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, weight_kg: e.target.value }))
                }
              />
              <Input
                placeholder="Шаги"
                value={form.steps}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, steps: e.target.value }))
                }
              />
              <Input
                placeholder="Сон, часы"
                value={form.sleep_hours}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sleep_hours: e.target.value }))
                }
              />
              <Input
                placeholder="Вода, мл"
                value={form.water_ml}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, water_ml: e.target.value }))
                }
              />
              <Input
                placeholder="Пульс покоя"
                value={form.resting_heart_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    resting_heart_rate: e.target.value,
                  }))
                }
              />
              <Input
                placeholder="Настроение 1-10"
                value={form.mood_score}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mood_score: e.target.value }))
                }
              />
              <Input
                placeholder="Систолическое"
                value={form.systolic_bp}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, systolic_bp: e.target.value }))
                }
              />
              <Input
                placeholder="Диастолическое"
                value={form.diastolic_bp}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, diastolic_bp: e.target.value }))
                }
              />
            </div>

            <div className="mt-3">
              <Input
                placeholder="Комментарий (необязательно)"
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saveMetricMutation.isPending}>
                <Activity className="mr-2 h-4 w-4" />
                {saveMetricMutation.isPending
                  ? "Сохраняем..."
                  : "Сохранить за сегодня"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(initialFormState)}
              >
                Сбросить
              </Button>
            </div>
          </form>
        </FadeIn>
      </div>

      <FadeIn delay={0.35} direction="up" distance={14}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Текущее состояние интеграции</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-primary" />
                Mobile Bridge
              </div>
              <p className="text-xs text-muted-foreground">
                Apple Health и Health Connect подключаются через мобильное
                приложение.
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4 text-primary" />
                OAuth API
              </div>
              <p className="text-xs text-muted-foreground">
                Fitbit, Garmin, Oura и другие устройства связываются через
                backend callback.
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-primary" />
                Browser Capabilities
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {Object.entries(browserCapabilities).map(([key, value]) => (
                  <span
                    key={key}
                    className={cn(
                      "rounded-full px-2 py-1",
                      value
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {key}: {value ? "yes" : "no"}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {todayEntry ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Последняя запись за сегодня: {todayEntry.weight_kg ?? "—"} кг,{" "}
              {todayEntry.steps?.toLocaleString("ru-RU") ?? "—"} шагов,{" "}
              {todayEntry.sleep_hours ?? "—"} ч сна.
            </p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              За сегодня записи пока нет. Добавьте первую запись вручную.
            </p>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
