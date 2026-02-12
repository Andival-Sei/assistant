import { useMemo } from "react";
import { FadeIn } from "@/components/motion";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Activity,
  Plus,
  ArrowRight,
  Brain,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const email = user?.email ?? "пользователь";
  const userName = email.split("@")[0];

  const { data: wallets } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions(10),
  });

  const totalBalance = useMemo(
    () => wallets?.reduce((acc, w) => acc + Number(w.balance), 0) || 0,
    [wallets]
  );

  const monthStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return (transactions || []).reduce(
      (acc, t) => {
        const date = new Date(t.date);
        if (date >= startOfMonth) {
          const amount = Number(t.amount);
          if (t.type === "income") acc.income += amount;
          if (t.type === "expense") acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const recentTransactions = transactions?.slice(0, 5) || [];

  return (
    <div className="space-y-10 pb-10">
      {/* Header */}
      <FadeIn direction="up" distance={12}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Обзор
            </h1>
            <p className="text-muted-foreground mt-1">
              Рады видеть вас снова,{" "}
              <span className="text-foreground font-medium">{userName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard/finance">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Транзакция
              </Button>
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* Quick Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FadeIn delay={0.1} direction="up" distance={14}>
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Баланс
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {totalBalance.toLocaleString("ru-RU")} ₽
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Все счета активны
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15} direction="up" distance={14}>
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-emerald-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Доход мес.
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {monthStats.income.toLocaleString("ru-RU")} ₽
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              За текущий месяц
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2} direction="up" distance={14}>
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-rose-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600">
                <TrendingDown className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Расход мес.
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {monthStats.expense.toLocaleString("ru-RU")} ₽
            </div>
            <div className="mt-2 text-xs text-rose-500/80">
              {monthStats.expense > 0
                ? `-${Math.round((monthStats.expense / totalBalance || 0) * 100)}% от баланса`
                : "Трат нет"}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.25} direction="up" distance={14}>
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-orange-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-orange-500/10 p-2 text-orange-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Задачи
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">0 / 0</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Все цели достигнуты
            </div>
          </div>
        </FadeIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <FadeIn delay={0.3} direction="up" distance={16}>
            <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-foreground">
                    Последние транзакции
                  </h3>
                </div>
                <Link
                  to="/dashboard/finance/transactions"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  Все <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="group flex items-center justify-between rounded-xl border border-transparent p-2 transition-all hover:bg-accent/40 hover:border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                            tx.type === "income"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-rose-500/10 text-rose-600"
                          )}
                        >
                          {tx.type === "income" ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {tx.description ||
                              (tx.type === "income" ? "Пополнение" : "Расход")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(tx.date), "d MMMM, HH:mm", {
                              locale: ru,
                            })}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-sm font-bold",
                          tx.type === "income"
                            ? "text-emerald-600"
                            : "text-foreground"
                        )}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {Number(tx.amount).toLocaleString("ru-RU")} ₽
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-muted/50 p-4 mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[240px]">
                    Здесь будут ваши последние операции. Начните вести учёт
                    прямо сейчас!
                  </p>
                </div>
              )}
            </div>
          </FadeIn>

          {/* Tasks Placeholder */}
          <FadeIn delay={0.35} direction="up" distance={16}>
            <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-orange-500" />
                  <h3 className="font-bold text-foreground">Список дел</h3>
                </div>
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600 uppercase">
                  Beta
                </span>
              </div>
              <div className="relative space-y-3 opacity-60 grayscale-[0.5]">
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
                  <div className="h-4 w-4 rounded-sm border-2 border-muted" />
                  <div className="h-3 w-1/3 rounded-full bg-muted" />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
                  <div className="h-4 w-4 rounded-sm border-2 border-muted" />
                  <div className="h-3 w-1/2 rounded-full bg-muted" />
                </div>
                {/* Overlay coming soon */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/20 backdrop-blur-[1px]">
                  <p className="text-xs font-bold text-foreground/80 tracking-widest uppercase">
                    Скоро появится
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Sidebar Area */}
        <aside className="space-y-6">
          {/* AI Guide */}
          <FadeIn delay={0.4} direction="up" distance={16}>
            <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-xl shadow-lg ring-1 ring-primary/20">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
                    <Brain className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-foreground">Инсайт дня</h3>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed italic">
                  «Вы потратили на 15% меньше в категории "Еда" на этой неделе.
                  Отличный результат! Эти средства можно направить в
                  накопления.»
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-primary/10 pt-4">
                  <span className="text-[10px] font-bold text-primary uppercase">
                    Smart Assistant
                  </span>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-6 w-6 rounded-full border-2 border-background bg-muted"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Health Status Dashboard */}
          <FadeIn delay={0.45} direction="up" distance={16}>
            <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-rose-500" />
                  <h3 className="font-bold text-foreground">Здоровье</h3>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                  No Data
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Активность</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-0 bg-rose-500 rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Сон</span>
                    <span className="font-medium">--ч --м</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-0 bg-blue-500 rounded-full" />
                  </div>
                </div>
                <p className="text-[11px] text-center text-muted-foreground pt-2">
                  Подключите Apple Health или Google Fit для анализа
                </p>
              </div>
            </div>
          </FadeIn>
        </aside>
      </div>
    </div>
  );
}
