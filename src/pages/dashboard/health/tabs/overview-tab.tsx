import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HealthOverviewTabProps } from "../health-types";
import { Link } from "react-router-dom";
import {
  Activity,
  Droplets,
  Footprints,
  HeartPulse,
  Moon,
  RefreshCw,
  Thermometer,
} from "lucide-react";

export function HealthOverviewTab({
  metricsCount,
  weeklyStats,
  connectedSyncIntegration,
  todayEntry,
  onSyncFitbit,
  isSyncPending,
}: HealthOverviewTabProps) {
  const cards = [
    {
      id: "steps",
      label: "Шаги / 7д",
      value: weeklyStats.avgSteps
        ? Math.round(weeklyStats.avgSteps).toLocaleString("ru-RU")
        : null,
      icon: <Footprints className="h-5 w-5" />,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      id: "sleep",
      label: "Сон / 7д",
      value: weeklyStats.avgSleep
        ? `${weeklyStats.avgSleep.toFixed(1)} ч`
        : null,
      icon: <Moon className="h-5 w-5" />,
      iconClass: "bg-blue-500/10 text-blue-600",
    },
    {
      id: "pulse",
      label: "Пульс / 7д",
      value: weeklyStats.avgPulse
        ? `${Math.round(weeklyStats.avgPulse)} уд/мин`
        : null,
      icon: <HeartPulse className="h-5 w-5" />,
      iconClass: "bg-rose-500/10 text-rose-600",
    },
    {
      id: "water",
      label: "Вода / 7д",
      value: weeklyStats.avgWater
        ? `${Math.round(weeklyStats.avgWater)} мл`
        : null,
      icon: <Droplets className="h-5 w-5" />,
      iconClass: "bg-cyan-500/10 text-cyan-600",
    },
    {
      id: "spo2",
      label: "SpO2 / 7д",
      value: weeklyStats.avgSpo2 ? `${weeklyStats.avgSpo2.toFixed(1)}%` : null,
      icon: <Activity className="h-5 w-5" />,
      iconClass: "bg-emerald-500/10 text-emerald-600",
    },
    {
      id: "temperature",
      label: "Темп / 7д",
      value: weeklyStats.avgTemperature
        ? `${weeklyStats.avgTemperature.toFixed(1)}°`
        : null,
      icon: <Thermometer className="h-5 w-5" />,
      iconClass: "bg-amber-500/10 text-amber-600",
    },
  ].filter((card) => card.value !== null);

  if (metricsCount === 0 || cards.length === 0) {
    return (
      <FadeIn delay={0.05} direction="up" distance={12}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-8 backdrop-blur-xl">
          <h3 className="text-xl font-semibold">Пока нет данных о здоровье</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Подключите Health Connect / Google Fit / Fitbit или добавьте первую
            запись вручную. После этого на обзорной панели появятся персональные
            метрики и тренды.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/dashboard/health/integrations">
              <Button size="sm">Перейти к интеграциям</Button>
            </Link>
            <Link to="/dashboard/health/manual">
              <Button size="sm" variant="outline">
                Открыть ручной журнал
              </Button>
            </Link>
          </div>
        </div>
      </FadeIn>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "grid gap-4",
          cards.length <= 2 && "sm:grid-cols-2",
          cards.length === 3 && "sm:grid-cols-3",
          cards.length >= 4 && "sm:grid-cols-2 xl:grid-cols-4"
        )}
      >
        {cards.map((card, index) => (
          <FadeIn
            key={card.id}
            delay={0.05 + index * 0.04}
            direction="up"
            distance={12}
          >
            <div className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className={cn("rounded-xl p-2", card.iconClass)}>
                  {card.icon}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {card.label}
                </span>
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
            </div>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.25} direction="up" distance={14}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <h3 className="font-semibold">Сводка</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Записей за 60 дней: {metricsCount}. Источник авто-синка:{" "}
            {connectedSyncIntegration
              ? connectedSyncIntegration.name
              : "не подключен"}
            .
          </p>

          {todayEntry ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Сегодня: {todayEntry.weight_kg ?? "—"} кг,{" "}
              {todayEntry.steps?.toLocaleString("ru-RU") ?? "—"} шагов,{" "}
              {todayEntry.sleep_hours ?? "—"} ч сна,{" "}
              {todayEntry.oxygen_saturation_pct ?? "—"}% SpO2,{" "}
              {todayEntry.blood_glucose_mmol_l ?? "—"} mmol/L.
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              На сегодня данных пока нет.
            </p>
          )}

          {connectedSyncIntegration && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSyncFitbit()}
                disabled={isSyncPending}
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4",
                    isSyncPending && "animate-spin"
                  )}
                />
                {isSyncPending
                  ? "Синхронизация..."
                  : "Авто-синк (пропущенные дни)"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSyncFitbit(30)}
                disabled={isSyncPending}
              >
                Запросить 30 дней
              </Button>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
