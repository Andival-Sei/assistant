import { FadeIn } from "@/components/motion";
import { Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { WalletList } from "../wallet-list";
import { TransactionList } from "../transaction-list";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";

export function OverviewTab() {
  const { data: wallets } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions({ limit: 100 }),
  });

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
    <div className="space-y-10">
      {/* Overview stats */}
      <FadeIn delay={0.1} direction="up" distance={12}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
          <div className="rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider md:text-sm">
                Баланс
              </span>
              <div className="rounded-xl bg-primary/10 p-2 text-primary md:p-2.5">
                <Wallet className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground md:text-3xl">
              {totalBalance.toLocaleString("ru-RU")} ₽
            </div>
            <p className="mt-2 hidden text-xs text-muted-foreground md:block">
              На {wallets?.length || 0} счетах
            </p>
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
            <div className="text-xl font-bold text-foreground md:text-3xl">
              {stats.income.toLocaleString("ru-RU")} ₽
            </div>
            <p className="mt-2 hidden text-xs text-muted-foreground md:block">
              За все время
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow md:col-span-1 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider md:text-sm">
                Расходы
              </span>
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-500 md:p-2.5">
                <ArrowDownLeft className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground md:text-3xl">
              {stats.expense.toLocaleString("ru-RU")} ₽
            </div>
            <p className="mt-2 hidden text-xs text-muted-foreground md:block">
              За все время
            </p>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.6fr)_380px]">
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
