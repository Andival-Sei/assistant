import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  X,
  Camera,
  Search,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Check,
  Trash2,
  Receipt,
  ArrowRightLeft,
  Wallet as WalletIcon,
} from "lucide-react";
import { TransactionType, Category } from "@/types/finance";
import { CategoryPicker } from "@/components/finance/category-picker";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import { CustomSelect } from "@/components/ui/custom-select";

// Error Boundary (kept same)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("AddTransactionForm Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-500">
          <p>Произошла ошибка при отрисовке формы.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => this.setState({ hasError: false })}
          >
            Попробовать снова
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface TransactionItem {
  id: string;
  amount: string;
  category: Category | null;
  description: string;
}

export function AddTransactionForm({
  walletId: defaultWalletId,
}: {
  walletId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "category">("form");
  const [type, setType] = useState<TransactionType>("expense");

  // Split Transaction State
  const [items, setItems] = useState<TransactionItem[]>([
    { id: "1", amount: "", category: null, description: "" },
  ]);
  const [activeItemId, setActiveItemId] = useState<string>("1");

  // Global Form State
  const [walletId, setWalletId] = useState(defaultWalletId || "");
  const [toWalletId, setToWalletId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Derived state for single-item logic (backward compatibility for UI)
  const isSplit = items.length > 1;
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const queryClient = useQueryClient();
  const { data: wallets } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  // Auto-select first wallet
  useEffect(() => {
    if (!walletId && wallets && wallets.length > 0) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId]);

  const mutation = useMutation({
    mutationFn: (data) => financeService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      // Don't close immediately if it's a batch, wait for all?
      // Actually mutationFn handles single tx. We need to handle batch in handleSubmit.
    },
    onError: (error) => {
      console.error("Failed to create transaction:", error);
      alert(
        `Ошибка при сохранении: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
    },
  });

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceipt(file);
      setIsScanning(true);

      // Simulate AI processing with multi-item response
      setTimeout(() => {
        setIsScanning(false);
        // Mock result: 2 items
        setItems([
          {
            id: crypto.randomUUID(),
            amount: "150",
            category: null,
            description: "Молоко",
          },
          {
            id: crypto.randomUUID(),
            amount: "300",
            category: null,
            description: "Бургер",
          },
        ]);
        setType("expense");
      }, 2000);
    }
  };

  const handleAddItem = () => {
    const newId = crypto.randomUUID();
    setItems([
      ...items,
      { id: newId, amount: "", category: null, description: "" },
    ]);
    setActiveItemId(newId);
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (items.length === 1) return;
    const newItems = items.filter((i) => i.id !== id);
    setItems(newItems);
    if (activeItemId === id) {
      setActiveItemId(newItems[newItems.length - 1].id);
    }
  };

  const updateItem = (id: string, field: keyof TransactionItem, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId) return;

    try {
      if (type === "transfer") {
        if (!toWalletId || !items[0].amount) return;
        await mutation.mutateAsync({
          wallet_id: walletId,
          to_wallet_id: toWalletId,
          amount: Number(items[0].amount),
          type: "transfer",
          description: items[0].description,
          date: date.toISOString(),
        });
      } else {
        // Create multiple transactions for expense/income
        for (const item of items) {
          if (!item.amount) continue;
          await mutation.mutateAsync({
            wallet_id: walletId,
            category_id: item.category?.id,
            amount: Number(item.amount),
            type,
            description: item.description,
            date: date.toISOString(),
            receipt_url: receipt ? URL.createObjectURL(receipt) : undefined,
          });
        }
      }
      setIsOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in mutation onError
    }
  };

  const resetForm = () => {
    setItems([{ id: "1", amount: "", category: null, description: "" }]);
    // setCategory(null); // Removed as state is managed in items
    setReceipt(null);
    setType("expense");
    setDate(new Date());
  };

  // Helper options for CustomSelect
  const walletOptions = useMemo(
    () =>
      wallets?.map((w) => ({
        value: w.id,
        label: w.name,
        icon: <span className="text-lg">{w.currency}</span>,
      })) || [],
    [wallets]
  );

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105"
      >
        <Plus className="mr-2 h-4 w-4" />
        Добавить
      </Button>
    );
  }

  const activeItem = items.find((i) => i.id === activeItemId) || items[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <ErrorBoundary>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold">
              {step === "category" ? "Выбор категории" : "Новая операция"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              disabled={mutation.isPending}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
            <AnimatePresence mode="wait">
              {step === "category" ? (
                <motion.div
                  key="category-picker"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="h-full"
                >
                  <CategoryPicker
                    type={type as "income" | "expense"}
                    onSelect={(cat) => {
                      updateItem(activeItemId, "category", cat);
                      setStep("form");
                    }}
                    onClose={() => setStep("form")}
                    selectedId={activeItem.category?.id}
                  />
                </motion.div>
              ) : (
                <motion.form
                  key="main-form"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  className="p-6 space-y-6"
                  onSubmit={handleSubmit}
                >
                  {/* Type Switcher */}
                  <div className="flex p-1 bg-muted rounded-xl relative z-0">
                    {/* Filter out Transfer if wallets < 2 */}
                    {(["expense", "income", "transfer"] as const)
                      .filter(
                        (t) =>
                          t !== "transfer" || (wallets && wallets.length >= 2)
                      )
                      .map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setType(t);
                            // Reset to single item if switching to transfer
                            if (t === "transfer") setItems([items[0]]);
                          }}
                          className={cn(
                            "relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10",
                            type === t
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {type === t && (
                            <motion.div
                              className="absolute inset-0 bg-background shadow-sm rounded-lg -z-10"
                              transition={{
                                type: "spring",
                                bounce: 0.2,
                                duration: 0.6,
                              }}
                            />
                          )}
                          {t === "expense"
                            ? "Расход"
                            : t === "income"
                              ? "Доход"
                              : "Перевод"}
                        </button>
                      ))}
                  </div>

                  {/* Split Tabs (Only for Expense) */}
                  {type === "expense" && items.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          onClick={() => setActiveItemId(item.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap cursor-pointer transition-all",
                            activeItemId === item.id
                              ? "bg-primary/10 border-primary text-primary font-medium"
                              : "bg-background border-border hover:bg-accent"
                          )}
                        >
                          <span>
                            #{index + 1} - {item.amount || "0"}₽
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 opacity-50 hover:opacity-100 hover:text-destructive"
                            onClick={(e) => handleRemoveItem(item.id, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddItem}
                        className="h-auto py-1.5 px-3 rounded-lg border-dashed"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Поз.
                      </Button>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div className="flex items-center border-b border-input focus-within:border-primary transition-colors">
                    <span
                      className={cn(
                        "text-3xl font-bold mr-2 transition-colors select-none",
                        activeItem.amount
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      ₽
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={activeItem.amount}
                      onChange={(e) =>
                        updateItem(activeItemId, "amount", e.target.value)
                      }
                      className="h-16 text-3xl font-bold bg-transparent border-0 rounded-none px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30"
                    />
                  </div>

                  {/* Wallets & Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <CustomSelect
                      label={type === "transfer" ? "Откуда" : "Счет"}
                      options={walletOptions}
                      value={walletId}
                      onChange={setWalletId}
                    />

                    {type === "transfer" ? (
                      <CustomSelect
                        label="Куда"
                        options={walletOptions.filter(
                          (o) => o.value !== walletId
                        )}
                        value={toWalletId}
                        onChange={setToWalletId}
                        placeholder="Выберите счет"
                      />
                    ) : (
                      <div>
                        <label className="text-xs text-muted-foreground ml-1 mb-1.5 block">
                          Дата
                        </label>
                        <CustomCalendar
                          selected={date}
                          onSelect={(d) => d && setDate(d)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Category Selector (Hidden for Transfer) */}
                  {type !== "transfer" && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground ml-1">
                        Категория
                      </label>
                      <div
                        className="flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-accent/50 cursor-pointer transition-all"
                        onClick={() => setStep("category")}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                              activeItem.category
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {activeItem.category ? (
                              // Make sure we handle emoji or icon correctly if added later
                              activeItem.category.name[0].toUpperCase()
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-sm">
                              {activeItem.category
                                ? activeItem.category.name
                                : "Выберите категорию"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground ml-1">
                      Комментарий
                    </label>
                    <Input
                      placeholder="Например: Продукты в Пятерочке"
                      value={activeItem.description}
                      onChange={(e) =>
                        updateItem(activeItemId, "description", e.target.value)
                      }
                      className="h-10 rounded-xl bg-background"
                    />
                  </div>

                  {/* Receipt Upload / Multi-item Add */}
                  <div className="flex gap-3">
                    <label
                      className={cn(
                        "flex-1 flex items-center justify-center h-12 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group relative overflow-hidden",
                        isScanning && "pointer-events-none opacity-80"
                      )}
                    >
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        disabled={isScanning}
                      />

                      {isScanning ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <span className="text-xs font-medium text-primary">
                            Сканируем...
                          </span>
                        </div>
                      ) : receipt ? (
                        <div className="flex items-center gap-2 text-primary">
                          <Check className="h-4 w-4" />
                          <span className="text-xs font-medium truncate max-w-[100px]">
                            {receipt.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                          <Camera className="h-4 w-4" />
                          <span className="text-xs font-medium">Скан чека</span>
                        </div>
                      )}
                    </label>

                    {type === "expense" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddItem}
                        className="flex-1 h-12 rounded-xl border-dashed hover:border-primary/50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить позицию
                      </Button>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-xl text-lg h-12 shadow-lg shadow-primary/20"
                    disabled={
                      !items.some((i) => i.amount) ||
                      !walletId ||
                      (type === "transfer" && !toWalletId) ||
                      mutation.isPending
                    }
                  >
                    {mutation.isPending
                      ? "Сохранение..."
                      : `Сохранить ${isSplit ? `(${totalAmount}₽)` : ""}`}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </ErrorBoundary>
      </motion.div>
    </div>
  );
}
