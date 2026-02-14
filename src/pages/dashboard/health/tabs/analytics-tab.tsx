import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { FadeIn } from "@/components/motion";
import type { HealthAnalyticsTabProps } from "../health-types";
import type { HealthMetricEntry } from "@/types/health";

type MetricCard = {
  label: string;
  value: string;
  hint: string;
};

function byDateAsc(a: HealthMetricEntry, b: HealthMetricEntry) {
  return (
    new Date(a.recorded_for).getTime() - new Date(b.recorded_for).getTime()
  );
}

function toEntriesWithSleep(entries: HealthMetricEntry[]) {
  return entries.filter(
    (entry) =>
      typeof entry.sleep_hours === "number" ||
      typeof entry.sleep_deep_hours === "number" ||
      typeof entry.sleep_light_hours === "number" ||
      typeof entry.sleep_rem_hours === "number"
  );
}

function avg(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((x): x is number => typeof x === "number");
  if (nums.length === 0) return null;
  return nums.reduce((acc, value) => acc + value, 0) / nums.length;
}

function sum(values: Array<number | null | undefined>): number {
  let total = 0;
  values.forEach((value) => {
    if (typeof value === "number") total += value;
  });
  return total;
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

function dayShort(date: string) {
  return format(parseISO(date), "EE", { locale: ru });
}

function dayLong(date: string) {
  return format(parseISO(date), "d MMM", { locale: ru });
}

export function HealthAnalyticsTab({ entries }: HealthAnalyticsTabProps) {
  const recent30 = useMemo(
    () => entries.slice(0, 30).sort(byDateAsc),
    [entries]
  );
  const recent7 = useMemo(() => entries.slice(0, 7).sort(byDateAsc), [entries]);

  const sleepEntries7 = useMemo(() => toEntriesWithSleep(recent7), [recent7]);
  const sleepEntries30 = useMemo(
    () => toEntriesWithSleep(recent30),
    [recent30]
  );

  const sleepAvg7 = useMemo(
    () => avg(sleepEntries7.map((entry) => entry.sleep_hours)),
    [sleepEntries7]
  );
  const sleepAvg30 = useMemo(
    () => avg(sleepEntries30.map((entry) => entry.sleep_hours)),
    [sleepEntries30]
  );

  const lastSleep = useMemo(() => {
    const rows = sleepEntries7.filter(
      (entry) => typeof entry.sleep_hours === "number"
    );
    if (rows.length === 0) return null;
    return rows[rows.length - 1];
  }, [sleepEntries7]);

  const stageTotals = useMemo(() => {
    const deep = sum(sleepEntries7.map((entry) => entry.sleep_deep_hours));
    const light = sum(sleepEntries7.map((entry) => entry.sleep_light_hours));
    const rem = sum(sleepEntries7.map((entry) => entry.sleep_rem_hours));
    const awake = sum(sleepEntries7.map((entry) => entry.sleep_awake_hours));
    const total = deep + light + rem + awake;
    return { deep, light, rem, awake, total };
  }, [sleepEntries7]);

  const stepAvg7 = useMemo(
    () => avg(recent7.map((entry) => entry.steps)),
    [recent7]
  );
  const stepSum7 = useMemo(
    () => sum(recent7.map((entry) => entry.steps)),
    [recent7]
  );
  const stepGoal = 6000;
  const maxSteps = useMemo(() => {
    const max = Math.max(...recent7.map((entry) => entry.steps ?? 0), stepGoal);
    return max <= 0 ? 1 : max;
  }, [recent7]);

  const topCards = useMemo<MetricCard[]>(() => {
    const cards: MetricCard[] = [];
    if (sleepAvg7 !== null) {
      cards.push({
        label: "Сон (7д среднее)",
        value: fmtHours(sleepAvg7),
        hint: "Цель 7-9 часов",
      });
    }
    if (stepAvg7 !== null) {
      cards.push({
        label: "Шаги (7д среднее)",
        value: `${fmtNumber(stepAvg7)} шагов`,
        hint: "Цель 6 000+",
      });
    }
    const spo2 = avg(recent7.map((entry) => entry.oxygen_saturation_pct));
    if (spo2 !== null) {
      cards.push({
        label: "SpO2 (7д среднее)",
        value: `${fmtNumber(spo2, 1)}%`,
        hint: "Насыщение крови кислородом",
      });
    }
    const pulse = avg(recent7.map((entry) => entry.resting_heart_rate));
    if (pulse !== null) {
      cards.push({
        label: "Пульс покоя (7д)",
        value: `${fmtNumber(pulse)} уд/мин`,
        hint: "Тренд восстановления",
      });
    }
    return cards;
  }, [recent7, sleepAvg7, stepAvg7]);

  if (entries.length === 0) {
    return (
      <FadeIn delay={0.05} direction="up" distance={12}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-8 backdrop-blur-xl">
          <h3 className="text-lg font-semibold">Аналитика пока недоступна</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Подключите Google Fit/Fitbit или добавьте записи вручную, чтобы
            увидеть сводку, тренды сна и активности.
          </p>
        </div>
      </FadeIn>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn delay={0.04} direction="up" distance={12}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <h3 className="text-lg font-semibold">Общая аналитика</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ключевые показатели за последнюю неделю. Появляются только метрики,
            по которым есть данные.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {topCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-border/50 bg-background/40 p-4"
              >
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-xl font-semibold">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.hint}
                </p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08} direction="up" distance={12}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Сон</h3>
              <p className="text-sm text-muted-foreground">
                Похоже на Google Fit: длительность + фазы (если фазы доступны).
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              7д:{" "}
              <span className="font-medium text-foreground">
                {fmtHours(sleepAvg7)}
              </span>{" "}
              • 30д:{" "}
              <span className="font-medium text-foreground">
                {fmtHours(sleepAvg30)}
              </span>
            </div>
          </div>

          {lastSleep && (
            <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <p className="text-xs text-violet-200/80">Последний сон</p>
              <p className="mt-1 text-xl font-semibold text-violet-100">
                {fmtHours(lastSleep.sleep_hours)}
              </p>
              <p className="text-xs text-violet-200/80">
                {dayLong(lastSleep.recorded_for)}
              </p>
            </div>
          )}

          {stageTotals.total > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs text-muted-foreground">
                Фазы сна (7д суммарно)
              </p>
              <div className="h-3 overflow-hidden rounded-full bg-background/70">
                <div
                  className="h-full bg-violet-400"
                  style={{
                    width: `${(stageTotals.light / stageTotals.total) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <p>Поверхностный: {fmtHours(stageTotals.light)}</p>
                <p>Глубокий: {fmtHours(stageTotals.deep)}</p>
                <p>REM: {fmtHours(stageTotals.rem)}</p>
                <p>Бодрствование: {fmtHours(stageTotals.awake)}</p>
              </div>
            </div>
          )}

          {sleepEntries7.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs text-muted-foreground">
                Ночи (последние 7 дней)
              </p>
              {sleepEntries7.map((entry) => {
                const deep = entry.sleep_deep_hours ?? 0;
                const light = entry.sleep_light_hours ?? 0;
                const rem = entry.sleep_rem_hours ?? 0;
                const totalStages = deep + light + rem;
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border/50 bg-background/40 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {dayLong(entry.recorded_for)}
                      </span>
                      <span className="font-medium text-foreground">
                        {fmtHours(entry.sleep_hours)}
                      </span>
                    </div>
                    {totalStages > 0 ? (
                      <div className="h-2 overflow-hidden rounded-full bg-background/80">
                        <div
                          className="h-full bg-violet-500"
                          style={{ width: `${(light / totalStages) * 100}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Детализация фаз недоступна
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.12} direction="up" distance={12}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Шаги</h3>
              <p className="text-sm text-muted-foreground">
                Недельный график активности с целевой линией.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Итого за 7д:{" "}
              <span className="font-medium text-foreground">
                {fmtNumber(stepSum7)} шагов
              </span>
            </div>
          </div>

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
                      className={`w-full rounded-md transition-all ${
                        reachedGoal ? "bg-emerald-400/90" : "bg-blue-400/80"
                      }`}
                      style={{ height: `${h}%` }}
                      title={`${dayLong(entry.recorded_for)}: ${steps.toLocaleString("ru-RU")} шагов`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {dayShort(entry.recorded_for)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Цель: {stepGoal.toLocaleString("ru-RU")} шагов/день</span>
            <span>Среднее: {fmtNumber(stepAvg7)} шагов</span>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
