import { useEffect, useMemo, useRef, useState } from "react";
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
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";

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
  const [hasError, setHasError] = useState(false);

  // Определяем мобильное устройство для оптимизации
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  }, []);

  const activeTab = useMemo(() => {
    const path = location.pathname;
    const matchedTab = [...tabs].reverse().find((t) => path.startsWith(t.path));
    return matchedTab?.id || "overview";
  }, [location.pathname]);

  const {
    data: wallets,
    isLoading,
    error: walletsError,
    refetch: refetchWallets,
  } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
    retry: (failureCount) => {
      // Ограничиваем количество попыток на мобильных
      if (isMobile && failureCount >= 2) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: financeService.getCategories,
    retry: (failureCount) => {
      if (isMobile && failureCount >= 2) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Обработка ошибок
  useEffect(() => {
    if (walletsError) {
      console.error("Error loading wallets:", walletsError);
      setHasError(true);
    } else if (categoriesError) {
      console.error("Error loading categories:", categoriesError);
    } else {
      setHasError(false);
    }
  }, [walletsError, categoriesError]);

  const seedCategoriesMutation = useMutation({
    mutationFn: () => financeService.seedDefaultCategories(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const hasAutoSeeded = useRef(false);

  // Компонент для обработки ошибок
  const ErrorFallback = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Ошибка загрузки</h3>
      <p className="text-muted-foreground mb-4">
        Не удалось загрузить данные. Проверьте подключение к интернету.
      </p>
      <Button
        onClick={() => {
          setHasError(false);
          refetchWallets();
        }}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Попробовать снова
      </Button>
    </div>
  );

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

  if (hasError && !wallets?.length) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto p-4">
        <ErrorFallback />
      </div>
    );
  }

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
    <ErrorBoundary>
      <div className="space-y-8 max-w-5xl mx-auto">
        <FadeIn
          direction="up"
          distance={isMobile ? 8 : 12}
          duration={isMobile ? 0.3 : 0.4}
        >
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
              walletId={
                wallets && wallets.length > 0 ? wallets[0].id : undefined
              }
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
                    transition={{
                      type: "spring",
                      stiffness: isMobile ? 300 : 380,
                      damping: isMobile ? 25 : 30,
                    }}
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
              initial={{ opacity: 0, x: isMobile ? 5 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isMobile ? -5 : -10 }}
              transition={{
                duration: isMobile ? 0.15 : 0.2,
                ease: "easeInOut",
              }}
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
    </ErrorBoundary>
  );
}
