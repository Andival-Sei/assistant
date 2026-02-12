import { useMemo } from "react";
import { FadeIn } from "@/components/motion";
import { AddTransactionForm } from "./add-transaction-form";
import { Onboarding } from "./onboarding";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./tabs/overview-tab";
import { CategoriesTab } from "./tabs/categories-tab";
import { WalletsTab } from "./tabs/wallets-tab";
import { TransactionsTab } from "./tabs/transactions-tab";
import { AnalyticsTab } from "./tabs/analytics-tab";

const tabs = [
  { id: "overview", label: "Обзор", path: "/dashboard/finance" },
  { id: "wallets", label: "Счета", path: "/dashboard/finance/wallets" },
  {
    id: "transactions",
    label: "Транзакции",
    path: "/dashboard/finance/transactions",
  },
  { id: "analytics", label: "Аналитика", path: "/dashboard/finance/analytics" },
  {
    id: "categories",
    label: "Категории",
    path: "/dashboard/finance/categories",
  },
];

export function FinancePage() {
  const queryClient = useQueryClient();
  const location = useLocation();

  const activeTab = useMemo(() => {
    const path = location.pathname;
    const matchedTab = [...tabs].reverse().find((t) => path.startsWith(t.path));
    return matchedTab?.id || "overview";
  }, [location.pathname]);

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <FadeIn direction="up" distance={12}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "pb-4 text-sm font-medium transition-colors relative",
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        <Routes>
          <Route index element={<OverviewTab />} />
          <Route
            path="overview"
            element={<Navigate to="/dashboard/finance" replace />}
          />
          <Route path="categories" element={<CategoriesTab />} />
          <Route path="wallets" element={<WalletsTab />} />
          <Route path="transactions" element={<TransactionsTab />} />
          <Route path="analytics" element={<AnalyticsTab />} />
        </Routes>
      </div>
    </div>
  );
}
