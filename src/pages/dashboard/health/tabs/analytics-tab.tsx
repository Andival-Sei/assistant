import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { HealthAnalyticsTabProps } from "../health-types";
import type { HealthMetricEntry } from "@/types/health";

function byDateAsc(a: HealthMetricEntry, b: HealthMetricEntry) {
  return (
    new Date(a.recorded_for).getTime() - new Date(b.recorded_for).getTime()
  );
}

function avg(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((x): x is number => typeof x === "number");
  if (nums.length === 0) return null;
  return nums.reduce((acc, value) => acc + value, 0) / nums.length;
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => {
    if (typeof value !== "number") return total;
    return total + value;
  }, 0);
}

function min(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((x): x is number => typeof x === "number");
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

function first(
  entries: HealthMetricEntry[],
  pick: (entry: HealthMetricEntry) => number | null
) {
  for (let i = 0; i < entries.length; i += 1) {
    const value = pick(entries[i]);
    if (typeof value === "number") return value;
  }
  return null;
}

function latest(
  entries: HealthMetricEntry[],
  pick: (entry: HealthMetricEntry) => number | null
) {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const value = pick(entries[i]);
    if (typeof value === "number") return value;
  }
  return null;
}

function fmtHours(value: number | null) {
  if (value === null) return "—";
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours} ч ${String(minutes).padStart(2, "0")} м`;
}

function fmtNumber(value: number | null, digits = 0) {
  if (value === null) return "—";
  if (digits === 0) return Math.round(value).toLocaleString("ru-RU");
  return value.toFixed(digits);
}

function dayLong(date: string) {
  return format(parseISO(date), "d MMM", { locale: ru });
}

type MetricTabId =
  | "overview"
  | "sleep"
  | "steps"
  | "pulse"
  | "spo2"
  | "weight"
  | "pressure"
  | "hydration";

const metricTabs: Array<{ id: MetricTabId; label: string }> = [
  { id: "overview", label: "Общее" },
  { id: "sleep", label: "Сон" },
  { id: "steps", label: "Шаги" },
  { id: "pulse", label: "Пульс" },
  { id: "spo2", label: "SpO2" },
  { id: "weight", label: "Вес" },
  { id: "pressure", label: "Давление" },
  { id: "hydration", label: "Вода" },
];

function Tile({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function HealthAnalyticsTab({ entries }: HealthAnalyticsTabProps) {
  const [activeMetricTab, setActiveMetricTab] =
    useState<MetricTabId>("overview");

  const recent30 = useMemo(
    () => entries.slice(0, 30).sort(byDateAsc),
    [entries]
  );
  const recent7 = useMemo(() => entries.slice(0, 7).sort(byDateAsc), [entries]);

  const sleepEntries = useMemo(
    () =>
      recent30.filter(
        (entry) =>
          typeof entry.sleep_hours === "number" ||
          typeof entry.sleep_deep_hours === "number" ||
          typeof entry.sleep_light_hours === "number" ||
          typeof entry.sleep_rem_hours === "number"
      ),
    [recent30]
  );

  const stepsAvg7 = useMemo(
    () => avg(recent7.map((entry) => entry.steps)),
    [recent7]
  );
  const sleepAvg7 = useMemo(
    () => avg(recent7.map((entry) => entry.sleep_hours)),
    [recent7]
  );
  const pulseAvg7 = useMemo(
    () => avg(recent7.map((entry) => entry.resting_heart_rate)),
    [recent7]
  );
  const spo2Avg7 = useMemo(
    () => avg(recent7.map((entry) => entry.oxygen_saturation_pct)),
    [recent7]
  );
  const weightLatest = useMemo(
    () => latest(recent30, (entry) => entry.weight_kg),
    [recent30]
  );
  const waterAvg7 = useMemo(
    () => avg(recent7.map((entry) => entry.water_ml)),
    [recent7]
  );

  const sleepStageTotals30 = useMemo(() => {
    const deep = sum(sleepEntries.map((entry) => entry.sleep_deep_hours));
    const light = sum(sleepEntries.map((entry) => entry.sleep_light_hours));
    const rem = sum(sleepEntries.map((entry) => entry.sleep_rem_hours));
    const awake = sum(sleepEntries.map((entry) => entry.sleep_awake_hours));
    const total = deep + light + rem + awake;
    return { deep, light, rem, awake, total };
  }, [sleepEntries]);

  const stepGoal = 6000;
  const firstWeight30 = useMemo(
    () => first(recent30, (entry) => entry.weight_kg),
    [recent30]
  );
  const latestWeight30 = useMemo(
    () => latest(recent30, (entry) => entry.weight_kg),
    [recent30]
  );
  const weightDelta30 = useMemo(() => {
    if (firstWeight30 === null || latestWeight30 === null) return null;
    return latestWeight30 - firstWeight30;
  }, [firstWeight30, latestWeight30]);
  const maxSteps = useMemo(() => {
    const max = Math.max(...recent7.map((entry) => entry.steps ?? 0), stepGoal);
    return max <= 0 ? 1 : max;
  }, [recent7]);

  if (entries.length === 0) {
    return (
      <FadeIn delay={0.05} direction="up" distance={12}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-8 backdrop-blur-xl">
          <h3 className="text-lg font-semibold">Аналитика пока недоступна</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Подключите Google Fit/Fitbit или добавьте записи вручную, чтобы
            увидеть тренды по каждой метрике.
          </p>
        </div>
      </FadeIn>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {metricTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveMetricTab(tab.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
                activeMetricTab === tab.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeMetricTab === "overview" && (
        <FadeIn delay={0.03} direction="up" distance={10}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Общая сводка</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Еженедельная витрина ключевых метрик + переход в детальные
              вкладки.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Tile
                title="Сон (7д)"
                value={fmtHours(sleepAvg7)}
                subtitle="цель 7-9 часов"
              />
              <Tile
                title="Шаги (7д)"
                value={`${fmtNumber(stepsAvg7)} / день`}
                subtitle="цель 6 000+"
              />
              <Tile
                title="Пульс покоя (7д)"
                value={`${fmtNumber(pulseAvg7)} уд/мин`}
                subtitle="восстановление"
              />
              <Tile
                title="SpO2 (7д)"
                value={`${fmtNumber(spo2Avg7, 1)}%`}
                subtitle="насыщение крови"
              />
              <Tile
                title="Вес (последний)"
                value={`${fmtNumber(weightLatest, 1)} кг`}
                subtitle="последнее измерение"
              />
              <Tile
                title="Вода (7д)"
                value={`${fmtNumber(waterAvg7)} мл`}
                subtitle="среднесуточно"
              />
            </div>
          </div>
        </FadeIn>
      )}

      {activeMetricTab === "sleep" && (
        <FadeIn delay={0.03} direction="up" distance={10}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Сон</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Анализ длительности сна и стадий (light/deep/REM/awake) за 30
              дней.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Tile
                title="Средний сон (7д)"
                value={fmtHours(avg(recent7.map((entry) => entry.sleep_hours)))}
                subtitle="ежедневно"
              />
              <Tile
                title="Средний сон (30д)"
                value={fmtHours(
                  avg(recent30.map((entry) => entry.sleep_hours))
                )}
                subtitle="долгий тренд"
              />
              <Tile
                title="Последняя ночь"
                value={fmtHours(latest(recent30, (entry) => entry.sleep_hours))}
                subtitle="последняя запись"
              />
              <Tile
                title="Ночей с фазами"
                value={fmtNumber(sleepEntries.length)}
                subtitle="детализированные ночи"
              />
            </div>

            {sleepStageTotals30.total > 0 && (
              <div className="mt-5 rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Структура стадий за 30 дней
                </p>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <p>Light: {fmtHours(sleepStageTotals30.light)}</p>
                  <p>Deep: {fmtHours(sleepStageTotals30.deep)}</p>
                  <p>REM: {fmtHours(sleepStageTotals30.rem)}</p>
                  <p>Awake: {fmtHours(sleepStageTotals30.awake)}</p>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-2">
              {recent7.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {dayLong(entry.recorded_for)}
                  </span>
                  <span className="font-medium">
                    {fmtHours(entry.sleep_hours)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {activeMetricTab === "steps" && (
        <FadeIn delay={0.03} direction="up" distance={10}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Шаги</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Недельная активность с контролем цели.
            </p>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {recent7.map((entry) => {
                const steps = entry.steps ?? 0;
                const h = Math.max((steps / maxSteps) * 100, steps > 0 ? 3 : 0);
                const reachedGoal = steps >= stepGoal;
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex h-36 w-full items-end rounded-xl bg-background/60 p-1">
                      <div
                        className={cn(
                          "w-full rounded-md transition-all",
                          reachedGoal ? "bg-emerald-400/90" : "bg-blue-400/80"
                        )}
                        style={{ height: `${h}%` }}
                        title={`${dayLong(entry.recorded_for)}: ${steps.toLocaleString("ru-RU")} шагов`}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {format(parseISO(entry.recorded_for), "EE", {
                        locale: ru,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Tile
                title="Сумма (7д)"
                value={`${fmtNumber(sum(recent7.map((entry) => entry.steps)))} шагов`}
                subtitle="итог недели"
              />
              <Tile
                title="Среднее (7д)"
                value={`${fmtNumber(stepsAvg7)} / день`}
                subtitle="среднесуточно"
              />
              <Tile
                title="Дней с целью"
                value={fmtNumber(
                  recent7.filter((entry) => (entry.steps ?? 0) >= stepGoal)
                    .length
                )}
                subtitle={`цель ${stepGoal.toLocaleString("ru-RU")}`}
              />
            </div>
          </div>
        </FadeIn>
      )}

      {activeMetricTab === "pulse" && (
        <FadeIn delay={0.03} direction="up" distance={10}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Пульс покоя</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Оценка восстановления и вариативности по неделе.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Tile
                title="Средний (7д)"
                value={`${fmtNumber(avg(recent7.map((entry) => entry.resting_heart_rate)))} уд/мин`}
                subtitle="рабочая неделя"
              />
              <Tile
                title="Средний (30д)"
                value={`${fmtNumber(avg(recent30.map((entry) => entry.resting_heart_rate)))} уд/мин`}
                subtitle="базовый фон"
              />
              <Tile
                title="Последний"
                value={`${fmtNumber(latest(recent30, (entry) => entry.resting_heart_rate))} уд/мин`}
                subtitle="последняя запись"
              />
            </div>
          </div>
        </FadeIn>
      )}

      {activeMetricTab === "spo2" && (
        <FadeIn delay={0.03} direction="up" distance={10}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">SpO2</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Контроль насыщения крови кислородом.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Tile
                title="Средний (7д)"
                value={`${fmtNumber(avg(recent7.map((entry) => entry.oxygen_saturation_pct)), 1)}%`}
                subtitle="короткий срез"
              />
              <Tile
                title="Средний (30д)"
                value={`${fmtNumber(avg(recent30.map((entry) => entry.oxygen_saturation_pct)), 1)}%`}
                subtitle="долгий срез"
              />
              <Tile
                title="Минимум (30д)"
                value={`${fmtNumber(min(recent30.map((entry) => entry.oxygen_saturation_pct)), 1)}%`}
                subtitle="минимальное значение"
              />
            </div>
          </div>
        </FadeIn>
      )}

      {activeMetricTab === "weight" && (
        <FadeIn delay={0.03} direction="up" distance={10}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Вес</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Текущая масса тела и изменение за 30 дней.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Tile
                title="Последний"
                value={`${fmtNumber(latestWeight30, 1)} кг`}
                subtitle="последнее измерение"
              />
              <Tile
                title="Средний (30д)"
                value={`${fmtNumber(avg(recent30.map((entry) => entry.weight_kg)), 1)} кг`}
                subtitle="средний вес"
              />
              <Tile
                title="Изменение (30д)"
                value={`${fmtNumber(weightDelta30, 1)} кг`}
                subtitle="последний минус первый"
              />
            </div>
          </div>
        </FadeIn>
      )}

      {activeMetricTab === "pressure" && (
        <FadeIn delay={0.03} direction="up" distance={10}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Давление</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Систолическое/диастолическое давление за последнюю неделю.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Tile
                title="Систолическое (7д)"
                value={`${fmtNumber(avg(recent7.map((entry) => entry.systolic_bp)))} мм рт.ст.`}
                subtitle="среднее"
              />
              <Tile
                title="Диастолическое (7д)"
                value={`${fmtNumber(avg(recent7.map((entry) => entry.diastolic_bp)))} мм рт.ст.`}
                subtitle="среднее"
              />
            </div>
          </div>
        </FadeIn>
      )}

      {activeMetricTab === "hydration" && (
        <FadeIn delay={0.03} direction="up" distance={10}>
          <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold">Вода</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Гидратация и соблюдение дневной цели 2 000 мл.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Tile
                title="Средний объем (7д)"
                value={`${fmtNumber(avg(recent7.map((entry) => entry.water_ml)))} мл`}
                subtitle="среднесуточно"
              />
              <Tile
                title="Сумма (7д)"
                value={`${fmtNumber(sum(recent7.map((entry) => entry.water_ml)))} мл`}
                subtitle="итог недели"
              />
              <Tile
                title="Дней с целью"
                value={fmtNumber(
                  recent7.filter((entry) => (entry.water_ml ?? 0) >= 2000)
                    .length
                )}
                subtitle=">= 2 000 мл"
              />
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
