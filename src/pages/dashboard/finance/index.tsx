import { useEffect, useMemo, useRef } from "react";
import { FadeIn } from "@/components/motion";
import { AnimatePresence, motion } from "framer-motion";
import { AddTransactionForm } from "./add-transaction-form";
import { Onboarding } from "./onboarding";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./tabs/overview-tab";
import { CategoriesTab } from "./tabs/categories-tab";
import { WalletsTab } from "./tabs/wallets-tab";
import { TransactionsTab } from "./tabs/transactions-tab";
import { AnalyticsTab } from "./tabs/analytics-tab";
import { LoadingScreen } from "@/components/ui/loading-screen";

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

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: financeService.getCategories,
  });

  const seedCategoriesMutation = useMutation({
    mutationFn: () => financeService.seedDefaultCategories(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const hasAutoSeeded = useRef(false);
  useEffect(() => {
    if (
      !categoriesLoading &&
      categories &&
      categories.length === 0 &&
      !seedCategoriesMutation.isPending &&
      !hasAutoSeeded.current
    ) {
      hasAutoSeeded.current = true;
      seedCategoriesMutation.mutate();
    }
  }, [
    categoriesLoading,
    categories,
    seedCategoriesMutation.isPending,
    seedCategoriesMutation,
  ]);

  if (isLoading) return <LoadingScreen />;

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
        <div className="flex gap-4 sm:gap-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={cn(
                "pb-4 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0",
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full"
          >
            <Routes location={location}>
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
