import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, CreditCard, Check } from "lucide-react";
import { Wallet } from "@/types/finance";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "sonner";

interface AddWalletModalProps {
  onClose: () => void;
  walletToEdit?: Wallet | null;
}

export function AddWalletModal({ onClose, walletToEdit }: AddWalletModalProps) {
  const [name, setName] = useState(walletToEdit?.name || "");
  const [balance, setBalance] = useState(
    walletToEdit?.balance?.toString() || "0"
  );
  const [currency, setCurrency] = useState(walletToEdit?.currency || "RUB");
  const [color, setColor] = useState(walletToEdit?.color || "#10b981");
  const [hasTransactions, setHasTransactions] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (walletToEdit) {
      financeService
        .hasWalletTransactions(walletToEdit.id)
        .then(setHasTransactions);
    }
  }, [walletToEdit]);

  const mutation = useMutation({
    mutationFn: (data: Partial<Wallet>) => {
      if (walletToEdit) {
        return financeService.updateWallet(walletToEdit.id, data);
      }
      return financeService.createWallet(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      onClose();
    },
    onError: (error) => {
      toast.error(
        `Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    mutation.mutate({
      name,
      balance: Number(balance),
      currency,
      color,
    });
  };

  const currencyOptions = [
    {
      value: "RUB",
      label: "RUB (₽)",
      icon: <span className="text-sm">₽</span>,
    },
    {
      value: "USD",
      label: "USD ($)",
      icon: <span className="text-sm">$</span>,
    },
    {
      value: "EUR",
      label: "EUR (€)",
      icon: <span className="text-sm">€</span>,
    },
  ];

  const colors = [
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#f59e0b", // Amber
    "#a855f7", // Purple
    "#ec4899", // Pink
    "#6366f1", // Indigo
    "#6b7280", // Gray
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold">
            {walletToEdit ? "Редактировать счёт" : "Новый счёт"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground ml-1">
                Название счёта
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Напр: Основная карта"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground ml-1">
                  Текущий баланс
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className={cn(
                    "h-11 rounded-xl font-bold text-lg",
                    hasTransactions && "opacity-50 cursor-not-allowed bg-muted"
                  )}
                  required
                  readOnly={hasTransactions}
                />
                {hasTransactions && (
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    Нельзя менять баланс, так как есть транзакции
                  </p>
                )}
              </div>
              <CustomSelect
                label="Валюта"
                options={currencyOptions}
                value={currency}
                onChange={setCurrency}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground ml-1">
                Цвет иконки
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                      color === c
                        ? "border-foreground scale-110 shadow-sm"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && (
                      <Check className="h-4 w-4 mx-auto text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl h-12"
              disabled={mutation.isPending}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="flex-[2] rounded-xl h-12 shadow-lg shadow-primary/20"
              disabled={mutation.isPending || !name}
            >
              {mutation.isPending
                ? "Сохранение..."
                : walletToEdit
                  ? "Сохранить"
                  : "Создать счёт"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
