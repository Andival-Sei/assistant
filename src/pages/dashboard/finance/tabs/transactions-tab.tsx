import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { TransactionList } from "../transaction-list";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TransactionsTab() {
  const [search, setSearch] = useState("");

  const { isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => financeService.getTransactions(500), // По-прежнему кэшируем в React Query
  });

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
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-border/50"
          >
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            Фильтры
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-border/50"
          >
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            Сортировка
          </Button>
        </div>
      </div>

      <div className="bg-card/30 rounded-2xl border border-border/50 backdrop-blur-xl overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <TransactionList limit={500} search={search} />
        )}
      </div>
    </div>
  );
}
