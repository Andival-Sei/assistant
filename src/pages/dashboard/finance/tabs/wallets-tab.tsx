import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import {
  Wallet as WalletIcon,
  Plus,
  MoreVertical,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

export function WalletsTab() {
  const { data: wallets, isLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  const totalBalance =
    wallets?.reduce((acc, w) => acc + Number(w.balance), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Mini Header / Stats */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-xl">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Общий баланс
          </h2>
          <div className="text-4xl font-bold text-foreground">
            {totalBalance.toLocaleString("ru-RU")} ₽
          </div>
        </div>
        <Button className="rounded-xl shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" />
          Добавить счёт
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wallets?.map((wallet, index) => (
            <FadeIn
              key={wallet.id}
              delay={index * 0.05}
              direction="up"
              distance={10}
            >
              <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl hover:border-primary/50 transition-all hover:shadow-lg">
                <div className="flex items-start justify-between mb-8">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center text-primary transition-colors",
                      "bg-primary/10 group-hover:bg-primary/20"
                    )}
                  >
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-foreground truncate">
                    {wallet.name}
                  </h3>
                  <div className="text-2xl font-bold text-primary">
                    {Number(wallet.balance).toLocaleString("ru-RU")} ₽
                  </div>
                </div>

                {/* Visual decoration */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      {wallets?.length === 0 && (
        <div className="p-12 text-center text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border/50">
          <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>У вас еще нет созданных счетов.</p>
          <Button variant="link" className="mt-2 text-primary">
            Создать первый счёт
          </Button>
        </div>
      )}
    </div>
  );
}
