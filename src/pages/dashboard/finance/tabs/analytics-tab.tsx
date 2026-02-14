import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { financeService } from "@/lib/services/finance-service";
import {
  PieChart,
  TrendingDown,
  TrendingUp,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { FadeIn } from "@/components/motion";
import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarModal } from "@/components/ui/calendar-modal";

type Period = "month" | "year" | "all" | "custom";

const IconComponent = ({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) => {
  if (!name) return null;

  // Handle emoji or single char
  if (name.length <= 2) return <span>{name}</span>;

  const formattedName =
    name.charAt(0).toUpperCase() +
    name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const pascalName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

  const iconMap = LucideIcons as unknown as Record<string, LucideIcon>;
  const Icon =
    iconMap[formattedName] || iconMap[pascalName] || LucideIcons.HelpCircle;

  return <Icon className={className} />;
};

export function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const queryParams = useMemo(() => {
    if (period === "all") return {};
    return {
      startDate: format(dateRange.start, "yyyy-MM-dd"),
      endDate: format(dateRange.end, "yyyy-MM-dd"),
    };
  }, [period, dateRange]);

  const { data: transactions } = useQuery({
    queryKey: ["transactions", queryParams],
    queryFn: () => financeService.getTransactions(queryParams),
  });

  const { income, expense, categoriesStats } = useMemo(() => {
    const stats = {
      income: 0,
      expense: 0,
      categoriesStats: {} as Record<
        string,
        { name: string; amount: number; color?: string; icon?: string }
      >,
    };

    (transactions || []).forEach((t) => {
      const amount = Number(t.amount);
      if (t.type === "income") {
        stats.income += amount;
      } else if (t.type === "expense") {
        stats.expense += amount;
        if (t.items) {
          t.items.forEach((item) => {
            const catId = item.category_id || "unassigned";
            if (!stats.categoriesStats[catId]) {
              stats.categoriesStats[catId] = {
                name: item.category?.name || "Без категории",
                amount: 0,
                color: item.category?.color,
                icon: item.category?.icon,
              };
            }
            stats.categoriesStats[catId].amount += Number(item.amount);
          });
        }
      }
    });

    return stats;
  }, [transactions]);

  const sortedCategories = Object.values(categoriesStats).sort(
    (a, b) => b.amount - a.amount
  );

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    const now = new Date();
    if (p === "month") {
      setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
    } else if (p === "year") {
      setDateRange({ start: startOfYear(now), end: endOfYear(now) });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Period Selector */}
      <FadeIn direction="down" distance={10}>
        <div className="flex flex-wrap items-center gap-2 bg-card/20 p-1.5 rounded-2xl border border-border/40 backdrop-blur-md w-fit">
          {(["month", "year", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                period === p
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "month" && "Месяц"}
              {p === "year" && "Год"}
              {p === "all" && "Всё время"}
            </button>
          ))}
          <div className="h-4 w-px bg-border/60 mx-1" />
          <button
            onClick={() => setIsCalendarOpen(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              period === "custom"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {period === "all"
              ? "Выбрать период"
              : `${format(dateRange.start, "dd.MM.yy")} - ${format(
                  dateRange.end,
                  "dd.MM.yy"
                )}`}
          </button>
        </div>
      </FadeIn>

      <CalendarModal
        isOpen={isCalendarOpen}
        mode="range"
        selected={{ from: dateRange.start, to: dateRange.end }}
        onSelect={(range: Date | { from: Date; to: Date } | undefined) => {
          if (
            range &&
            typeof range === "object" &&
            "from" in range &&
            "to" in range
          ) {
            setDateRange({ start: range.from, end: range.to });
            setPeriod("custom");
          }
        }}
        onClose={() => setIsCalendarOpen(false)}
      />

      <FadeIn direction="up" distance={10} delay={0.1}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingDown size={80} />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 uppercase tracking-widest font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Расходы
            </div>
            <div className="text-3xl font-black">
              {expense.toLocaleString("ru-RU")} ₽
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-rose-500/80 uppercase">
              <ArrowDownRight size={14} />
              На 12% больше чем обычно
            </div>
          </div>

          <div className="bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={80} />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 uppercase tracking-widest font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Доходы
            </div>
            <div className="text-3xl font-black">
              {income.toLocaleString("ru-RU")} ₽
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-500/80 uppercase">
              <ArrowUpRight size={14} />
              Стабильный поток
            </div>
          </div>

          <div className="bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <Target size={80} />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 uppercase tracking-widest font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Чистая прибыль
            </div>
            <div className="text-3xl font-black">
              {(income - expense).toLocaleString("ru-RU")} ₽
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-primary/80 uppercase">
              <Zap size={14} />
              {income > expense ? "В плюсе" : "В минусе"}
            </div>
          </div>

          <div className="bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-xl border-dashed flex flex-col items-center justify-center text-muted-foreground text-center px-4 relative group cursor-help">
            <div className="text-xs italic font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              AI Аналитика
            </div>
            <div className="text-[10px] mt-1 text-primary font-bold uppercase tracking-tighter">
              Скоро: Персональные советы
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="bg-card/30 p-8 rounded-3xl border border-border/50 backdrop-blur-xl lg:col-span-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-3">
                <PieChart className="h-6 w-6 text-primary" />
                Распределение трат
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Где исчезают ваши деньги
              </p>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-2xl border border-border/40">
              <span className="text-xs text-muted-foreground font-bold uppercase">
                Всего за период:
              </span>
              <span className="text-lg font-black text-primary">
                {expense.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </div>

          <div className="grid gap-y-8 gap-x-12 sm:grid-cols-2">
            {sortedCategories.length === 0 ? (
              <div className="sm:col-span-2 py-20 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <PieChart className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <div className="text-muted-foreground italic font-medium">
                  Нет данных за этот период
                </div>
              </div>
            ) : (
              sortedCategories.map((cat, index) => {
                const percentage =
                  expense > 0 ? (cat.amount / expense) * 100 : 0;
                return (
                  <FadeIn
                    key={cat.name}
                    delay={index * 0.05}
                    direction="up"
                    distance={8}
                  >
                    <div className="group cursor-default">
                      <div className="flex items-center justify-between text-sm mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform duration-300"
                            style={{
                              backgroundColor: cat.color
                                ? `${cat.color}20`
                                : "#6b728020",
                              color: cat.color || "#6b7280",
                            }}
                          >
                            <IconComponent
                              name={cat.icon || "Package"}
                              className="h-5 w-5"
                            />
                          </div>
                          <div>
                            <div className="font-black text-foreground/90 leading-tight">
                              {cat.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                              {percentage.toFixed(1)}% от трат
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-base">
                            {cat.amount.toLocaleString("ru-RU")} ₽
                          </div>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden border border-border/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{
                            duration: 1,
                            delay: 0.2 + index * 0.1,
                            ease: "easeOut",
                          }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: cat.color || "#6b7280",
                            boxShadow: `0 0 12px ${cat.color}40`,
                          }}
                        />
                      </div>
                    </div>
                  </FadeIn>
                );
              })
            )}
          </div>
        </section>

        <section className="lg:col-span-4 space-y-6">
          <div className="bg-linear-to-br from-primary/10 to-transparent p-8 rounded-3xl border border-primary/20 backdrop-blur-xl h-full flex flex-col">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Инсайты
            </h3>
            <div className="space-y-4 flex-1">
              <div className="bg-background/40 p-4 rounded-2xl border border-border/40">
                <div className="text-[10px] font-bold uppercase text-primary mb-1">
                  Совет дня
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Ваши траты на категорию{" "}
                  <strong>"{sortedCategories[0]?.name || "..."}"</strong>{" "}
                  выросли на 15%. Попробуйте установить лимит.
                </p>
              </div>

              <div className="bg-background/40 p-4 rounded-2xl border border-border/40">
                <div className="text-[10px] font-bold uppercase text-emerald-500 mb-1">
                  Хорошая новость
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Вы сэкономили <strong>2 400 ₽</strong> на подписках в этом
                  месяце.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="mt-8 w-full rounded-2xl border-primary/30 hover:bg-primary/5 text-primary font-bold py-6"
            >
              Сгенерировать отчет
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
