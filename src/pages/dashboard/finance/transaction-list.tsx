import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { ArrowUpRight, ArrowDownLeft, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion";

export function TransactionList() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions(20),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-2xl bg-muted/50"
          />
        ))}
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center backdrop-blur-sm">
        <Receipt className="mx-auto h-8 w-8 text-muted-foreground opacity-20" />
        <h3 className="mt-4 text-sm font-medium text-foreground">
          Транзакций пока нет
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx, index) => (
        <FadeIn key={tx.id} delay={index * 0.05} direction="up" distance={10}>
          <div className="group flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 p-4 transition-all hover:bg-card hover:shadow-md">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  tx.type === "income"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                )}
              >
                {tx.type === "income" ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : (
                  <ArrowDownLeft className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {tx.description || "Без описания"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "font-bold text-sm",
                  tx.type === "income" ? "text-emerald-500" : "text-foreground"
                )}
              >
                {tx.type === "income" ? "+" : "-"}
                {Math.abs(tx.amount).toLocaleString("ru-RU")} ₽
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {(tx as any).wallets?.name || "Wallet"}
              </p>
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}
