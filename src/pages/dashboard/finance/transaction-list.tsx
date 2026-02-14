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
import type {
  TransactionFilterType,
  TransactionSortBy,
} from "./tabs/transactions-tab";
import { parseISO } from "date-fns";

function DateHeader({ date }: { date: string }) {
  return (
    <motion.div layout="position" className="sticky top-0 z-10 pt-1 pb-2">
      <div className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1.5 text-muted-foreground backdrop-blur-md">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-medium">{date}</span>
      </div>
    </motion.div>
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
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/50 px-4 py-3.5 transition-all hover:border-border hover:bg-card hover:shadow-sm">
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
            className="ml-12 pl-4 border-l-2 border-border/60 mt-2 mb-1 rounded-r"
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

export interface TransactionListFilter {
  type?: TransactionFilterType;
  walletId?: string;
}

interface TransactionListProps {
  limit?: number;
  search?: string;
  filter?: TransactionListFilter;
  sortBy?: TransactionSortBy;
}

function sortTransactions(
  list: TransactionWithItems[],
  sortBy: TransactionSortBy
): TransactionWithItems[] {
  const arr = [...list];
  switch (sortBy) {
    case "dateDesc":
      return arr.sort(
        (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
      );
    case "dateAsc":
      return arr.sort(
        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
      );
    case "amountDesc":
      return arr.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    case "amountAsc":
      return arr.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
    default:
      return arr;
  }
}

export function TransactionList({
  limit = 20,
  search = "",
  filter,
  sortBy = "dateDesc",
}: TransactionListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", limit],
    queryFn: () => financeService.getTransactions({ limit }),
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    let list = transactions;

    if (search) {
      list = list.filter((tx) =>
        tx.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filter?.type && filter.type !== "all") {
      list = list.filter((tx) => tx.type === filter.type);
    }
    if (filter?.walletId) {
      list = list.filter((tx) => tx.wallet_id === filter.walletId);
    }

    return sortTransactions(list, sortBy);
  }, [transactions, search, filter?.type, filter?.walletId, sortBy]);

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

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="px-4 py-4 space-y-3"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 w-full animate-pulse rounded-xl bg-muted/50"
            />
          ))}
        </motion.div>
      ) : !transactions?.length ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="px-4 py-8"
        >
          <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center backdrop-blur-sm">
            <Package className="mx-auto h-8 w-8 text-muted-foreground opacity-20" />
            <h3 className="mt-4 text-sm font-medium text-foreground">
              Транзакций пока нет
            </h3>
          </div>
        </motion.div>
      ) : !filteredTransactions.length ? (
        <motion.div
          key="not-found"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="px-4 py-8"
        >
          <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center backdrop-blur-sm">
            <Package className="mx-auto h-8 w-8 text-muted-foreground opacity-20" />
            <h3 className="mt-4 text-sm font-medium text-foreground">
              Ничего не найдено
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Измените поиск или фильтры
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="px-4 py-4 space-y-6"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {Array.from(grouped.entries()).map(
              ([dateKey, dateTransactions]) => (
                <motion.div
                  key={dateKey}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.2,
                    layout: {
                      type: "spring",
                      stiffness: 500,
                      damping: 40,
                    },
                  }}
                  className="space-y-3"
                >
                  <DateHeader date={dateKey} />
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {dateTransactions.map((tx) => (
                        <FadeIn
                          key={tx.id}
                          layout
                          direction="none"
                          distance={0}
                          delay={0}
                          exit={{
                            opacity: 0,
                            scale: 0.98,
                            transition: { duration: 0.2 },
                          }}
                          transition={{
                            layout: {
                              type: "spring",
                              stiffness: 500,
                              damping: 40,
                            },
                            opacity: { duration: 0.2 },
                          }}
                        >
                          <TransactionRow
                            tx={tx}
                            isExpanded={expandedIds.has(tx.id)}
                            onToggleExpand={() => toggleExpand(tx.id)}
                          />
                        </FadeIn>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
