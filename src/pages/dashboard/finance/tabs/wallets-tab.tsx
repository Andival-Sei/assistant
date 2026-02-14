import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import {
  Wallet as WalletIcon,
  Plus,
  MoreVertical,
  CreditCard,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";
import { AddWalletModal } from "../add-wallet-modal";
import { AnimatePresence, motion } from "framer-motion";
import { Wallet } from "@/types/finance";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function WalletsTab() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeService.deleteWallet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      setActiveMenuId(null);
    },
    onError: (error) => {
      toast.error(
        `Ошибка при удалении: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
    },
  });

  const totalBalance =
    wallets?.reduce((acc, w) => acc + Number(w.balance), 0) || 0;

  const handleDelete = (id: string, name: string) => {
    setWalletToDelete({ id, name });
    setActiveMenuId(null);
  };

  const handleEdit = (wallet: Wallet) => {
    setWalletToEdit(wallet);
    setIsAddModalOpen(true);
    setActiveMenuId(null);
  };

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
        <Button
          className="rounded-xl shadow-lg shadow-primary/20"
          onClick={() => {
            setWalletToEdit(null);
            setIsAddModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить счёт
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
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
              <div
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-xl hover:border-primary/50 transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1"
                style={
                  {
                    "--glow-color": wallet.color || "var(--primary)",
                  } as React.CSSProperties
                }
              >
                <div className="flex items-start justify-between mb-8">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center transition-colors shadow-inner"
                    )}
                    style={{
                      backgroundColor: `${wallet.color || "#10b981"}20`,
                      color: wallet.color || "#10b981",
                    }}
                  >
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "rounded-full transition-all duration-200 relative z-20",
                        activeMenuId === wallet.id
                          ? "opacity-100 bg-accent"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(
                          activeMenuId === wallet.id ? null : wallet.id
                        );
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    <AnimatePresence>
                      {activeMenuId === wallet.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-10 z-40 w-48 rounded-xl border border-border bg-card p-1 shadow-xl box-content"
                          >
                            <button
                              onClick={() => handleEdit(wallet)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                              Переименовать
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(wallet.id, wallet.name)
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                              Удалить
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-foreground truncate">
                    {wallet.name}
                  </h3>
                  <div className="text-2xl font-bold text-primary">
                    {Number(wallet.balance).toLocaleString("ru-RU")}{" "}
                    {wallet.currency === "USD"
                      ? "$"
                      : wallet.currency === "EUR"
                        ? "€"
                        : "₽"}
                  </div>
                </div>

                {/* Visual decoration */}
                <div
                  className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full blur-3xl opacity-20 transition-all duration-500 ease-in-out group-hover:opacity-40 pointer-events-none"
                  style={{ backgroundColor: wallet.color || "var(--primary)" }}
                />
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      {wallets?.length === 0 && !isLoading && (
        <div className="p-12 text-center text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border/50">
          <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>У вас еще нет созданных счетов.</p>
          <Button
            variant="link"
            className="mt-2 text-primary"
            onClick={() => {
              setWalletToEdit(null);
              setIsAddModalOpen(true);
            }}
          >
            Создать первый счёт
          </Button>
        </div>
      )}

      <AnimatePresence>
        {isAddModalOpen && (
          <AddWalletModal
            onClose={() => {
              setIsAddModalOpen(false);
              setWalletToEdit(null);
            }}
            walletToEdit={walletToEdit}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!walletToDelete}
        onClose={() => setWalletToDelete(null)}
        onConfirm={() => {
          if (walletToDelete) {
            deleteMutation.mutate(walletToDelete.id);
          }
        }}
        title="Удаление счёта"
        description={`Вы уверены, что хотите удалить счёт "${walletToDelete?.name}"? Все связанные транзакции также будут удалены.`}
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}
