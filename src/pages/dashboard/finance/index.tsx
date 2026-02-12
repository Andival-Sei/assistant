import { FadeIn } from "@/components/motion";
import { Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { WalletList } from "./wallet-list";
import { TransactionList } from "./transaction-list";
import { AddTransactionForm } from "./add-transaction-form";
import { Onboarding } from "./onboarding";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";

export function FinancePage() {
  const queryClient = useQueryClient();
  const { data: wallets, isLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  // If loading, we wait (or show skeleton, handled inside components mostly, but for onboarding check we might want a global skeleton)
  // For now let's just return null or a loader if we strictly need to wait for wallets to know if we show onboarding.
  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions(100),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        Загрузка...
      </div>
    );

  if (!wallets?.length) {
    return (
      <Onboarding
        onComplete={() =>
          queryClient.invalidateQueries({ queryKey: ["wallets"] })
        }
      />
    );
  }

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

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <FadeIn direction="up" distance={12}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Финансы
            </h1>
            <p className="text-muted-foreground mt-1">
              Управляйте вашими деньгами в один клик
            </p>
          </div>
          <AddTransactionForm
            walletId={wallets && wallets.length > 0 ? wallets[0].id : undefined}
          />
        </div>
      </FadeIn>

      {/* Overview stats */}
      <FadeIn delay={0.1} direction="up" distance={12}>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Баланс
              </span>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {totalBalance.toLocaleString("ru-RU")} ₽
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              На {wallets?.length || 0} счетах
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Доходы
              </span>
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stats.income.toLocaleString("ru-RU")} ₽
            </div>
            <p className="mt-2 text-xs text-muted-foreground">За все время</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Расходы
              </span>
              <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-500">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stats.expense.toLocaleString("ru-RU")} ₽
            </div>
            <p className="mt-2 text-xs text-muted-foreground">За все время</p>
          </div>
        </div>
      </FadeIn>

      {/* Main Grid: Wallets and Recent stuff */}
      <div className="grid gap-10 lg:grid-cols-[1fr_350px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              Счета
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {wallets?.length || 0}
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
            <h3 className="font-bold mb-4">Умная воронка</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Здесь скоро появится AI-ассистент, который будет анализировать
              ваши траты и давать советы.
            </p>
            <div className="mt-6 h-24 rounded-xl bg-primary/5 border border-dashed border-primary/20 flex flex-col items-center justify-center p-4">
              <span className="text-[10px] uppercase font-bold text-primary/40 italic">
                Coming Soon
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
