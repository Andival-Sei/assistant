import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { PieChart, TrendingDown } from "lucide-react";
import { FadeIn } from "@/components/motion";

export function AnalyticsTab() {
  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions(500),
  });

  const categoriesStats = (transactions || []).reduce(
    (
      acc: Record<
        string,
        { name: string; amount: number; color?: string; icon?: string }
      >,
      t
    ) => {
      if (t.type !== "expense" || !t.items) return acc;

      t.items.forEach((item) => {
        const catId = item.category_id || "unassigned";
        if (!acc[catId]) {
          acc[catId] = {
            name: item.category?.name || "Без категории",
            amount: 0,
            color: item.category?.color,
            icon: item.category?.icon,
          };
        }
        acc[catId].amount += Number(item.amount);
      });

      return acc;
    },
    {}
  );

  const sortedCategories = Object.values(categoriesStats).sort(
    (a, b) => b.amount - a.amount
  );
  const totalExpense = sortedCategories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-8">
      <FadeIn direction="up" distance={10}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2 uppercase tracking-wide font-medium">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              Траты за месяц
            </div>
            <div className="text-2xl font-bold">
              {totalExpense.toLocaleString("ru-RU")} ₽
            </div>
          </div>
          {/* Сюда можно добавить больше карточек — ср. чек, кол-во транз и т.д. */}
          <div className="bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-xl border-dashed flex items-center justify-center text-muted-foreground text-xs text-center px-4 italic">
            Больше метрик появится после накопления данных
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-8 lg:grid-cols-1">
        <section className="bg-card/30 p-8 rounded-2xl border border-border/50 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Расходы по категориям
            </h2>
            <span className="text-sm text-muted-foreground">
              Всего: {totalExpense.toLocaleString("ru-RU")} ₽
            </span>
          </div>

          <div className="space-y-6">
            {sortedCategories.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground italic">
                Нет данных для анализа расходов
              </div>
            ) : (
              sortedCategories.map((cat, index) => {
                const percentage =
                  totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                return (
                  <FadeIn
                    key={cat.name}
                    delay={index * 0.05}
                    direction="right"
                    distance={8}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color || "#6b7280" }}
                          />
                          <span className="font-semibold">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {cat.amount.toLocaleString("ru-RU")} ₽
                          </span>
                          <span className="font-bold w-10 text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: cat.color || "#6b7280",
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
      </div>
    </div>
  );
}
