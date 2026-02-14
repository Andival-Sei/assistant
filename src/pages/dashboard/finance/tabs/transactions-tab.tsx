import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { TransactionList } from "../transaction-list";
import { Search, Filter, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TransactionFilterType = "all" | "income" | "expense";
export type TransactionSortBy =
  | "dateDesc"
  | "dateAsc"
  | "amountDesc"
  | "amountAsc";

const SORT_LABELS: Record<TransactionSortBy, string> = {
  dateDesc: "Сначала новые",
  dateAsc: "Сначала старые",
  amountDesc: "По сумме: убывание",
  amountAsc: "По сумме: возрастание",
};

import { Skeleton } from "@/components/ui/skeleton";

export function TransactionsTab() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<TransactionFilterType>("all");
  const [walletId, setWalletId] = useState<string>("");
  const [sortBy, setSortBy] = useState<TransactionSortBy>("dateDesc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const { data: wallets } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  const { isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions({ limit: 500 }),
  });

  const hasActiveFilter = filterType !== "all" || walletId !== "";
  const filterLabel =
    filterType !== "all"
      ? filterType === "income"
        ? "Доходы"
        : "Расходы"
      : walletId
        ? (wallets?.find((w) => w.id === walletId)?.name ?? "Счёт")
        : "Фильтры";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card/30 p-4 rounded-2xl border border-border/50 backdrop-blur-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по описанию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-xl border-border/50",
                  hasActiveFilter && "border-primary/50 text-primary"
                )}
              >
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                {hasActiveFilter ? filterLabel : "Фильтры"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-56 p-2">
              <div className="space-y-1">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Тип
                </p>
                {[
                  { value: "all" as const, label: "Все" },
                  { value: "income" as const, label: "Доходы" },
                  { value: "expense" as const, label: "Расходы" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterType(opt.value)}
                    className={cn(
                      "w-full rounded-lg py-2 px-3 text-left text-sm transition-colors",
                      filterType === opt.value
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {wallets && wallets.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Счёт
                  </p>
                  <button
                    type="button"
                    onClick={() => setWalletId("")}
                    className={cn(
                      "w-full rounded-lg py-2 px-3 text-left text-sm transition-colors",
                      !walletId
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    Все счета
                  </button>
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWalletId(w.id)}
                      className={cn(
                        "w-full rounded-lg py-2 px-3 text-left text-sm transition-colors",
                        walletId === w.id
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border/50"
              >
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                {SORT_LABELS[sortBy]}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-56 p-2">
              <div className="space-y-0.5">
                {[
                  {
                    value: "dateDesc" as const,
                    label: "Сначала новые",
                    icon: ArrowDown,
                  },
                  {
                    value: "dateAsc" as const,
                    label: "Сначала старые",
                    icon: ArrowUp,
                  },
                  {
                    value: "amountDesc" as const,
                    label: "По сумме: убывание",
                    icon: ArrowDown,
                  },
                  {
                    value: "amountAsc" as const,
                    label: "По сумме: возрастание",
                    icon: ArrowUp,
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.value);
                      setSortOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-lg py-2 px-3 text-left text-sm flex items-center gap-2 transition-colors",
                      sortBy === opt.value
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <opt.icon className="h-4 w-4 shrink-0" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="bg-card/30 rounded-2xl border border-border/50 backdrop-blur-xl overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[72px] rounded-xl border border-border/50 bg-card/10 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <Skeleton className="h-4 w-[60%]" />
                    <Skeleton className="h-3 w-[40%]" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TransactionList
            limit={500}
            search={search}
            filter={{ type: filterType, walletId: walletId || undefined }}
            sortBy={sortBy}
          />
        )}
      </div>
    </div>
  );
}
