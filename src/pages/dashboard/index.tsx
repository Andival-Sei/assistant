import { useMemo } from "react";
import { FadeIn } from "@/components/motion";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { tasksService } from "@/lib/services/tasks-service";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
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
import { Skeleton } from "@/components/ui/skeleton";

function normalizeTransactionLabel(
  description: string | null | undefined,
  type: string
) {
  const raw = (description || "").trim();
  const mapType = (value: string) => {
    if (value === "income") return "Пополнение";
    if (value === "expense") return "Расход";
    if (value === "transfer") return "Перевод";
    return null;
  };

  if (raw) {
    return mapType(raw.toLowerCase()) || raw;
  }

  return mapType(type.toLowerCase()) || "Операция";
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const email = user?.email ?? "пользователь";
  const userName = email.split("@")[0];

  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions({ limit: 200 }),
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksService.getTasks(),
  });

  const isFinanceLoading = walletsLoading || transactionsLoading;

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

  const tasksStats = useMemo(() => {
    const list = tasks ?? [];
    const total = list.length;
    const done = list.filter((task) => task.is_completed).length;
    const active = total - done;

    return {
      total,
      done,
      active,
    };
  }, [tasks]);

  const monthExpenseSharePercent = useMemo(() => {
    if (!totalBalance || totalBalance <= 0) {
      return null;
    }
    if (!monthStats.expense || monthStats.expense <= 0) {
      return 0;
    }
    return Math.round((monthStats.expense / totalBalance) * 100);
  }, [monthStats.expense, totalBalance]);

  const recentTransactions = transactions?.slice(0, 5) || [];
  const tasksPreview = useMemo(() => {
    const list = tasks ?? [];
    const active = list.filter((task) => !task.is_completed);
    return active.slice(0, 4);
  }, [tasks]);

  const insightText = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return "Добавьте первую транзакцию — и здесь появятся инсайты по тратам.";
    }

    const net = monthStats.income - monthStats.expense;
    const netText =
      net >= 0
        ? `Доходы выше расходов на ${Math.abs(net).toLocaleString("ru-RU")} ₽ за месяц.`
        : `Расходы выше доходов на ${Math.abs(net).toLocaleString("ru-RU")} ₽ за месяц.`;

    if (monthExpenseSharePercent === null) {
      return netText;
    }

    return `${netText} Доля расходов: ${monthExpenseSharePercent}% от текущего баланса.`;
  }, [
    monthExpenseSharePercent,
    monthStats.expense,
    monthStats.income,
    transactions,
  ]);

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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <FadeIn delay={0.1} direction="up" distance={14}>
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-primary/5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                Баланс
              </span>
            </div>
            <div className="text-xl font-bold text-foreground sm:text-2xl">
              {isFinanceLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                `${totalBalance.toLocaleString("ru-RU")} ₽`
              )}
            </div>
            <div className="mt-2 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              {isFinanceLoading ? (
                <Skeleton className="h-3 w-32" />
              ) : (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Все счета активны
                </>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15} direction="up" distance={14}>
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-emerald-500/5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                Доход мес.
              </span>
            </div>
            <div className="text-xl font-bold text-foreground sm:text-2xl">
              {isFinanceLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                `${monthStats.income.toLocaleString("ru-RU")} ₽`
              )}
            </div>
            <div className="mt-2 hidden text-xs text-muted-foreground sm:block">
              {isFinanceLoading ? (
                <Skeleton className="h-3 w-32" />
              ) : (
                "За текущий месяц"
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2} direction="up" distance={14}>
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-rose-500/5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                Расход мес.
              </span>
            </div>
            <div className="text-xl font-bold text-foreground sm:text-2xl">
              {isFinanceLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                `${monthStats.expense.toLocaleString("ru-RU")} ₽`
              )}
            </div>
            <div className="mt-2 hidden text-xs text-rose-500/80 sm:block">
              {isFinanceLoading ? (
                <Skeleton className="h-3 w-40" />
              ) : monthStats.expense > 0 &&
                monthExpenseSharePercent !== null ? (
                `-${monthExpenseSharePercent}% от баланса`
              ) : monthStats.expense > 0 &&
                monthExpenseSharePercent === null ? (
                "Баланс пока 0 ₽"
              ) : (
                "Трат нет"
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.25} direction="up" distance={14}>
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-orange-500/5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-orange-500/10 p-2 text-orange-600">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                Задачи
              </span>
            </div>
            <div className="text-xl font-bold text-foreground sm:text-2xl">
              {tasksLoading ? "—" : `${tasksStats.done} / ${tasksStats.total}`}
            </div>
            <div className="mt-2 hidden text-xs text-muted-foreground sm:block">
              {tasksLoading
                ? "Загрузка..."
                : tasksStats.active > 0
                  ? `Активных: ${tasksStats.active}`
                  : "Нет активных задач"}
            </div>
          </div>
        </FadeIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <FadeIn delay={0.3} direction="up" distance={16}>
            <div>
              <div className="mb-4 flex items-center justify-between">
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

              {transactionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="group flex items-center justify-between rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-xl transition-all hover:border-primary/20 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                            tx.type === "income"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : tx.type === "expense"
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-sky-500/10 text-sky-500"
                          )}
                        >
                          {tx.type === "income" ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : tx.type === "expense" ? (
                            <TrendingDown className="h-5 w-5" />
                          ) : (
                            <ArrowRightLeft className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {normalizeTransactionLabel(tx.description, tx.type)}
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
                            : tx.type === "expense"
                              ? "text-foreground"
                              : "text-sky-500"
                        )}
                      >
                        {tx.type === "income"
                          ? "+"
                          : tx.type === "expense"
                            ? "-"
                            : ""}
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

          {/* Tasks */}
          <FadeIn delay={0.35} direction="up" distance={16}>
            <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-orange-500" />
                  <h3 className="font-bold text-foreground">Список дел</h3>
                </div>
                <Link
                  to="/dashboard/tasks"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  Открыть <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-xl bg-muted/50"
                    />
                  ))}
                </div>
              ) : tasksPreview.length > 0 ? (
                <div className="space-y-2">
                  {tasksPreview.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/40 px-4 py-3 backdrop-blur-xl"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-4 w-4 rounded-sm border-2 border-orange-500/60" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {task.due_at
                              ? format(new Date(task.due_at), "d MMMM, HH:mm", {
                                  locale: ru,
                                })
                              : "Без даты"}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase">
                        todo
                      </span>
                    </div>
                  ))}
                  {tasksStats.active > tasksPreview.length ? (
                    <p className="pt-2 text-xs text-muted-foreground">
                      И ещё {tasksStats.active - tasksPreview.length} в списке.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted/50 p-4 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[260px]">
                    Активных задач нет. Добавьте первую — и она появится здесь.
                  </p>
                  <Link to="/dashboard/tasks" className="mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить задачу
                    </Button>
                  </Link>
                </div>
              )}
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
                {transactionsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-[60%]" />
                  </div>
                ) : (
                  <p className="text-sm text-foreground/80 leading-relaxed italic">
                    «{insightText}»
                  </p>
                )}
                <div className="mt-6 flex items-center justify-between border-t border-primary/10 pt-4">
                  <span className="text-[10px] font-bold text-primary uppercase">
                    На основе транзакций
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
            <Link to="/dashboard/health" className="block">
              <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl shadow-sm transition-all hover:shadow-md hover:border-primary/30">
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
                    Подключите устройства или начните с ручного ввода
                  </p>
                </div>
              </div>
            </Link>
          </FadeIn>
        </aside>
      </div>
    </div>
  );
}
