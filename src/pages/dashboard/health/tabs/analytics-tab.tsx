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

type StepsPeriod = "week" | "month" | "all";

const stepsPeriodTabs: Array<{ id: StepsPeriod; label: string }> = [
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "all", label: "Всё время" },
];

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

// Компонент для отображения недели
function WeekStepsView({ data }: { data: HealthMetricEntry[] }) {
  const stepGoal = 10000;
  const maxSteps = Math.max(...data.map((entry) => entry.steps ?? 0), stepGoal);

  const totalSteps = sum(data.map((entry) => entry.steps));
  const avgSteps = avg(data.map((entry) => entry.steps));
  const goalDays = data.filter(
    (entry) => (entry.steps ?? 0) >= stepGoal
  ).length;

  // Заполняем неделю всеми днями (включая пустые)
  const weekDays = useMemo(() => {
    const days = [];
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + mondayOffset + i);
      const dateStr = date.toISOString().split("T")[0];
      const entry = data.find((e) => e.recorded_for === dateStr);
      days.push({ date: dateStr, entry });
    }
    return days;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-7 gap-2">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {weekDays.map(({ date, entry }) => {
          const steps = entry?.steps ?? 0;
          const h = Math.max((steps / maxSteps) * 100, steps > 0 ? 3 : 0);
          const reachedGoal = steps >= stepGoal;
          const isToday = date === new Date().toISOString().split("T")[0];

          return (
            <div key={date} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-32 w-full items-end rounded-xl bg-background/60 p-1 relative",
                  isToday && "ring-2 ring-primary/30"
                )}
              >
                <div
                  className={cn(
                    "w-full rounded-md transition-all",
                    reachedGoal ? "bg-emerald-400/90" : "bg-blue-400/80"
                  )}
                  style={{ blockSize: `${h}%` }}
                  title={`${dayLong(date)}: ${steps.toLocaleString("ru-RU")} шагов`}
                />
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  "text-[11px]",
                  isToday ? "text-primary font-bold" : "text-muted-foreground"
                )}
              >
                {format(parseISO(date), "d", { locale: ru })}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          title="Сумма за неделю"
          value={`${fmtNumber(totalSteps)} шагов`}
          subtitle={`${data.length} дней`}
        />
        <Tile
          title="Среднее в день"
          value={`${fmtNumber(avgSteps)} / день`}
          subtitle="среднесуточно"
        />
        <Tile
          title="Дней с целью"
          value={`${goalDays} из 7`}
          subtitle={`цель ${stepGoal.toLocaleString("ru-RU")}`}
        />
      </div>
    </div>
  );
}

// Компонент для отображения месяца
function MonthStepsView({ data }: { data: HealthMetricEntry[] }) {
  const stepGoal = 6000;

  const totalSteps = sum(data.map((entry) => entry.steps));
  const avgSteps = avg(data.map((entry) => entry.steps));
  const goalDays = data.filter(
    (entry) => (entry.steps ?? 0) >= stepGoal
  ).length;

  // Создаем календарную сетку
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay() || 7; // Воскресенье = 7 для удобства

    const days = [];

    // Пустые дни до начала месяца
    for (let i = 1; i < startWeekday; i++) {
      days.push(null);
    }

    // Дни месяца
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split("T")[0];
      const entry = data.find((e) => e.recorded_for === dateStr);
      days.push({ date: dateStr, entry, dayOfMonth: i });
    }

    return days;
  }, [data]);

  const getStepsColor = (steps: number | null | undefined) => {
    if (!steps) return "bg-gray-100";
    if (steps >= stepGoal * 1.2) return "bg-emerald-500";
    if (steps >= stepGoal) return "bg-emerald-400";
    if (steps >= stepGoal * 0.5) return "bg-blue-400";
    return "bg-blue-300";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
          <div
            key={day}
            className="text-[11px] font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const steps = day.entry?.steps ?? 0;
          const isToday = day.date === new Date().toISOString().split("T")[0];

          return (
            <div
              key={day.date}
              className={cn(
                "aspect-square rounded-lg p-1 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all relative",
                getStepsColor(steps),
                isToday && "ring-2 ring-primary/50 ring-offset-1"
              )}
              title={`${day.dayOfMonth} число: ${steps.toLocaleString("ru-RU")} шагов`}
            >
              <div className="text-xs font-bold">{day.dayOfMonth}</div>
              {steps > 0 && (
                <div className="text-[9px] font-medium opacity-80">
                  {steps >= 1000 ? `${Math.floor(steps / 1000)}к` : steps}
                </div>
              )}
              {isToday && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          title="Сумма за месяц"
          value={`${fmtNumber(totalSteps)} шагов`}
          subtitle={`${data.length} дней`}
        />
        <Tile
          title="Среднее в день"
          value={`${fmtNumber(avgSteps)} / день`}
          subtitle="среднесуточно"
        />
        <Tile
          title="Дней с целью"
          value={`${goalDays} из ${data.length}`}
          subtitle={`${Math.round((goalDays / data.length) * 100)}% успеха`}
        />
        <Tile
          title="Лучший день"
          value={`${fmtNumber(Math.max(...data.map((e) => e.steps ?? 0)))} шагов`}
          subtitle="рекорд месяца"
        />
      </div>
    </div>
  );
}

// Компонент для отображения всей статистики
function AllTimeStepsView({ data }: { data: HealthMetricEntry[] }) {
  const stepGoal = 6000;

  const totalSteps = sum(data.map((entry) => entry.steps));
  const avgSteps = avg(data.map((entry) => entry.steps));
  const goalDays = data.filter(
    (entry) => (entry.steps ?? 0) >= stepGoal
  ).length;

  const bestDay = data.reduce(
    (best, current) =>
      (current.steps ?? 0) > (best.steps ?? 0) ? current : best,
    data[0]
  );

  const currentStreak = useMemo(() => {
    let streak = 0;
    const sortedData = [...data].sort(byDateAsc).reverse();
    for (const entry of sortedData) {
      if ((entry.steps ?? 0) >= stepGoal) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [data]);

  // Топ-10 лучших дней
  const topDays = useMemo(
    () =>
      [...data]
        .filter((e) => e.steps !== null)
        .sort((a, b) => (b.steps ?? 0) - (a.steps ?? 0))
        .slice(0, 10),
    [data]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          title="Всего шагов"
          value={`${fmtNumber(totalSteps)}`}
          subtitle={`за ${data.length} дней`}
        />
        <Tile
          title="Среднее в день"
          value={`${fmtNumber(avgSteps)} / день`}
          subtitle="всё время"
        />
        <Tile
          title="Дней с целью"
          value={`${goalDays} из ${data.length}`}
          subtitle={`${Math.round((goalDays / data.length) * 100)}% успеха`}
        />
        <Tile
          title="Текущая серия"
          value={`${currentStreak} дней`}
          subtitle="подряд с целью"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-background/40 p-4 rounded-2xl border border-border/50">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span>🏆</span> Лучший день
          </h4>
          <div className="text-2xl font-black text-primary">
            {fmtNumber(bestDay?.steps)} шагов
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {dayLong(bestDay?.recorded_for || "")}
          </div>
        </div>

        <div className="bg-background/40 p-4 rounded-2xl border border-border/50">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span>🔥</span> Топ-10 дней
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {topDays.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                      index === 0
                        ? "bg-yellow-500 text-white"
                        : index === 1
                          ? "bg-gray-400 text-white"
                          : index === 2
                            ? "bg-orange-600 text-white"
                            : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">
                    {dayLong(entry.recorded_for)}
                  </span>
                </div>
                <span className="font-medium">{fmtNumber(entry.steps)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HealthAnalyticsTab({ entries }: HealthAnalyticsTabProps) {
  const [activeMetricTab, setActiveMetricTab] =
    useState<MetricTabId>("overview");
  const [stepsPeriod, setStepsPeriod] = useState<StepsPeriod>("week");

  const recent30 = useMemo(
    () => entries.slice(0, 30).sort(byDateAsc),
    [entries]
  );
  const recent7 = useMemo(() => entries.slice(0, 7).sort(byDateAsc), [entries]);

  // Получаем данные для текущей недели (с понедельника)
  const currentWeekData = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Воскресенье = 0, Понедельник = 1
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return entries
      .filter((entry) => {
        const entryDate = new Date(entry.recorded_for);
        return entryDate >= monday && entryDate <= sunday;
      })
      .sort(byDateAsc);
  }, [entries]);

  // Получаем данные для текущего месяца
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return entries
      .filter((entry) => {
        const entryDate = new Date(entry.recorded_for);
        return entryDate >= firstDay && entryDate <= lastDay;
      })
      .sort(byDateAsc);
  }, [entries]);

  // Получаем данные для отображения в зависимости от периода
  const stepsData = useMemo(() => {
    switch (stepsPeriod) {
      case "week":
        return currentWeekData;
      case "month":
        return currentMonthData;
      case "all":
        return [...entries].sort(byDateAsc);
      default:
        return currentWeekData;
    }
  }, [stepsPeriod, currentWeekData, currentMonthData, entries]);

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

  const firstWeight30 = useMemo(() => {
    for (let i = 0; i < recent30.length; i += 1) {
      const value = recent30[i].weight_kg;
      if (typeof value === "number") return value;
    }
    return null;
  }, [recent30]);
  const latestWeight30 = useMemo(
    () => latest(recent30, (entry) => entry.weight_kg),
    [recent30]
  );
  const weightDelta30 = useMemo(() => {
    if (firstWeight30 === null || latestWeight30 === null) return null;
    return latestWeight30 - firstWeight30;
  }, [firstWeight30, latestWeight30]);

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold">Шаги</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stepsPeriod === "week" && "Активность за текущую неделю"}
                  {stepsPeriod === "month" && "Активность за текущий месяц"}
                  {stepsPeriod === "all" && "Общая статистика за всё время"}
                </p>
              </div>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-xl border border-border/40">
                {stepsPeriodTabs.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setStepsPeriod(period.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      stepsPeriod === period.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {stepsPeriod === "week" && <WeekStepsView data={stepsData} />}

            {stepsPeriod === "month" && <MonthStepsView data={stepsData} />}

            {stepsPeriod === "all" && <AllTimeStepsView data={stepsData} />}
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
