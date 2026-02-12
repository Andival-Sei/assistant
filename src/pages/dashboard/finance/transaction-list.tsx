import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Package,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion";
import type { TransactionWithItems } from "@/types/finance";
import { groupByDate } from "@/lib/utils/date";
import { pluralizePosition } from "@/lib/utils/pluralize";
import { motion, AnimatePresence } from "framer-motion";

function DateHeader({ date }: { date: string }) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-b">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          {date}
        </span>
      </div>
    </div>
  );
}

function TransactionRow({
  tx,
  isExpanded,
  onToggleExpand,
}: {
  tx: TransactionWithItems;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const hasItems = tx.items && tx.items.length > 1;

  return (
    <div className="group">
      <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/40 p-4 transition-all hover:bg-card hover:shadow-md">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tx.type === "income"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
            )}
          >
            {tx.type === "income" ? (
              <ArrowUpRight className="h-5 w-5" />
            ) : hasItems ? (
              <Package className="h-5 w-5" />
            ) : (
              <ArrowDownLeft className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {hasItems ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className="text-left w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <span className="font-semibold text-foreground text-sm">
                  {tx.items!.length} {pluralizePosition(tx.items!.length)}
                </span>
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.span>
              </button>
            ) : (
              <>
                <p className="font-semibold text-foreground text-sm truncate">
                  {tx.description || "Без описания"}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
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
            {tx.wallets?.name ?? "Счёт"}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {hasItems && isExpanded && tx.items && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-14 pl-4 border-l-2 border-muted mt-1 mb-2"
          >
            <div className="space-y-1 py-2">
              {tx.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground truncate">
                      {item.category?.name || "Без категории"}
                    </span>
                    {item.description && (
                      <span className="text-muted-foreground/60 truncate text-xs">
                        · {item.description}
                      </span>
                    )}
                  </div>
                  <span className="text-rose-600 dark:text-rose-400 font-medium shrink-0 ml-4">
                    -{Number(item.amount).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TransactionListProps {
  limit?: number;
  search?: string;
}

export function TransactionList({
  limit = 20,
  search = "",
}: TransactionListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", limit],
    queryFn: () => financeService.getTransactions(limit),
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!search) return transactions;
    return transactions.filter((tx) =>
      tx.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [transactions, search]);

  const grouped = useMemo(() => {
    if (!filteredTransactions.length)
      return new Map<string, TransactionWithItems[]>();
    return groupByDate(filteredTransactions);
  }, [filteredTransactions]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
        <Package className="mx-auto h-8 w-8 text-muted-foreground opacity-20" />
        <h3 className="mt-4 text-sm font-medium text-foreground">
          Транзакций пока нет
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([dateKey, dateTransactions]) => (
        <div key={dateKey} className="space-y-3">
          <DateHeader date={dateKey} />
          <div className="space-y-3">
            {dateTransactions.map((tx, index) => (
              <FadeIn
                key={tx.id}
                delay={index * 0.03}
                direction="up"
                distance={8}
              >
                <TransactionRow
                  tx={tx}
                  isExpanded={expandedIds.has(tx.id)}
                  onToggleExpand={() => toggleExpand(tx.id)}
                />
              </FadeIn>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
