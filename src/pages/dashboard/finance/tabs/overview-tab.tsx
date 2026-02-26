import { FadeIn } from "@/components/motion";
import { Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { WalletList } from "../wallet-list";
import { TransactionList } from "../transaction-list";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewTab() {
  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions({ limit: 100 }),
  });

  const isLoading = walletsLoading || transactionsLoading;

  const totalBalance =
    wallets?.reduce((acc, w) => acc + Number(w.balance), 0) || 0;

  const stats = (transactions || []).reduce(
    (acc, t) => {
      const amount = Number(t.amount);
      if (t.type === "income") acc.income += amount;
      if (t.type === "expense") acc.expense += amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const net = stats.income - stats.expense;
  const biggestExpense = (transactions || [])
    .filter((tx) => tx.type === "expense")
    .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))[0];

  return (
    <div className="space-y-10">
      {/* Overview stats */}
      <FadeIn delay={0.1} direction="up" distance={12}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider md:text-sm">
                Баланс
              </span>
              <div className="rounded-xl bg-primary/10 p-2 text-primary md:p-2.5">
                <Wallet className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums whitespace-nowrap text-foreground sm:text-3xl xl:text-4xl">
              {isLoading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                `${totalBalance.toLocaleString("ru-RU")} ₽`
              )}
            </div>
            <div className="mt-2 hidden text-xs text-muted-foreground md:block">
              {isLoading ? (
                <Skeleton className="h-3 w-40" />
              ) : (
                <>На {wallets?.length || 0} счетах</>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider md:text-sm">
                Доходы
              </span>
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500 md:p-2.5">
                <ArrowUpRight className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums whitespace-nowrap text-foreground sm:text-3xl xl:text-4xl">
              {isLoading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                `${stats.income.toLocaleString("ru-RU")} ₽`
              )}
            </div>
            <div className="mt-2 hidden text-xs text-muted-foreground md:block">
              {isLoading ? <Skeleton className="h-3 w-32" /> : "За все время"}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow sm:col-span-2 md:p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider md:text-sm">
                Расходы
              </span>
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-500 md:p-2.5">
                <ArrowDownLeft className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums whitespace-nowrap text-foreground sm:text-3xl xl:text-4xl">
              {isLoading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                `${stats.expense.toLocaleString("ru-RU")} ₽`
              )}
            </div>
            <div className="mt-2 hidden text-xs text-muted-foreground md:block">
              {isLoading ? <Skeleton className="h-3 w-32" /> : "За все время"}
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_380px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              Счета
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {isLoading ? (
                  <Skeleton className="h-4 w-10" />
                ) : (
                  wallets?.length || 0
                )}
              </span>
            </h2>
            <WalletList />
          </section>

          <section>
            <h2 className="text-xl font-bold mb-5">Последние транзакции</h2>
            <TransactionList />
          </section>
        </div>

        <aside className="space-y-8">
          <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl">
            <h3 className="font-bold mb-4">Сводка</h3>

            <div className="space-y-3">
              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Чистый итог
                </p>
                {isLoading ? (
                  <>
                    <Skeleton className="mt-3 h-6 w-32" />
                    <Skeleton className="mt-2 h-3 w-40" />
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-2xl font-bold tabular-nums">
                      {net >= 0 ? "+" : "-"}
                      {Math.abs(net).toLocaleString("ru-RU")} ₽
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Доходы − расходы (за выборку)
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Самый большой расход
                </p>
                {isLoading ? (
                  <>
                    <Skeleton className="mt-3 h-5 w-32" />
                    <Skeleton className="mt-2 h-3 w-40" />
                  </>
                ) : biggestExpense ? (
                  <>
                    <p className="mt-2 text-lg font-bold tabular-nums">
                      -
                      {Math.abs(Number(biggestExpense.amount)).toLocaleString(
                        "ru-RU"
                      )}{" "}
                      ₽
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {biggestExpense.description || "Без описания"}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Расходов пока нет
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Баланс
                </p>
                {isLoading ? (
                  <>
                    <Skeleton className="mt-3 h-5 w-28" />
                    <Skeleton className="mt-2 h-3 w-40" />
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-lg font-bold tabular-nums">
                      {totalBalance.toLocaleString("ru-RU")} ₽
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      На {wallets?.length || 0} счетах
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
