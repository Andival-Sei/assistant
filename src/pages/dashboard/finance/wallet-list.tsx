import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Wallet as WalletIcon, CreditCard } from "lucide-react";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

export function WalletList() {
  const { data: wallets, isLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 sm:gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-26 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!wallets?.length) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 sm:gap-4">
      {wallets.map((wallet, index) => (
        <FadeIn
          key={wallet.id}
          delay={index * 0.1}
          direction="up"
          distance={15}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/50 p-5 shadow-sm transition-all hover:shadow-md group cursor-pointer",
              "p-4 md:p-5",
              "bg-linear-to-br from-card/80 to-card/40 backdrop-blur-xl"
            )}
          >
            <div className="absolute -right-4 -top-4 text-primary/5 transition-transform group-hover:scale-110 group-hover:-rotate-12">
              <CreditCard className="h-24 w-24" />
            </div>

            <div className="mb-3 flex min-w-0 items-center gap-2 md:mb-6 md:gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <WalletIcon className="h-4 w-4" />
              </div>
              <span
                title={wallet.name}
                className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground md:text-sm"
              >
                {wallet.name}
              </span>
            </div>

            <div className="relative">
              <div className="text-[clamp(1.125rem,1.8vw,1.5rem)] font-bold tabular-nums whitespace-nowrap tracking-tight text-foreground">
                {Number(wallet.balance).toLocaleString("ru-RU")}{" "}
                {wallet.currency === "RUB" ? "₽" : wallet.currency}
              </div>
              <div className="mt-1 hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                <div className="h-1 w-1 rounded-full bg-emerald-500" />
                Активен
              </div>
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}
