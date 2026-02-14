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
  Check,
  Package,
  Sparkles,
  Loader2,
} from "lucide-react";
import { TransactionType, Category } from "@/types/finance";
import { CategoryPicker } from "@/components/finance/category-picker";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "sonner";

interface FormItem {
  id: string;
  amount: string;
  category: Category | null;
  description: string;
}

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

  componentDidCatch(error: unknown, errorInfo: unknown) {
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

const emptyItem = (): FormItem => ({
  id: crypto.randomUUID(),
  amount: "",
  category: null,
  description: "",
});

const ScanningOverlay = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-[100] bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
  >
    <div className="relative h-32 w-full max-w-[280px] overflow-hidden rounded-2xl border bg-card shadow-2xl flex flex-col items-center justify-center gap-3">
      {/* Laser line animation */}
      <motion.div
        className="absolute inset-x-0 h-1 bg-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.8)] z-10"
        animate={{ insetBlockStart: ["0%", "100%", "0%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative z-0 opacity-20">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-4 w-12 bg-muted rounded" />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 relative z-20">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">Анализируем...</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
            Gemini AI Working
          </p>
        </div>
      </div>
    </div>
  </motion.div>
);

export function AddTransactionForm({
  walletId: defaultWalletId,
}: {
  walletId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "category">("form");
  const [type, setType] = useState<TransactionType>("expense");

  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [activeCategoryItemId, setActiveCategoryItemId] = useState<
    string | null
  >(null);

  const [walletId, setWalletId] = useState(defaultWalletId || "");
  const [toWalletId, setToWalletId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const isSplit = type === "expense" && items.length > 1;
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const queryClient = useQueryClient();
  const { data: wallets } = useQuery({
    queryKey: ["wallets"],
    queryFn: financeService.getWallets,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: financeService.getCategories,
  });

  useEffect(() => {
    if (!walletId && wallets && wallets.length > 0) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId]);

  const createMutation = useMutation({
    mutationFn: (
      data: Parameters<typeof financeService.createTransaction>[0]
    ) => financeService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
    onError: (error) => {
      console.error("Failed to create transaction:", error);
      toast.error(
        `Ошибка при сохранении: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
    },
  });

  const createWithItemsMutation = useMutation({
    mutationFn: (
      data: Parameters<typeof financeService.createTransactionWithItems>[0]
    ) => financeService.createTransactionWithItems(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
    onError: (error) => {
      console.error("Failed to create transaction:", error);
      toast.error(
        `Ошибка при сохранении: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
    },
  });

  const isPending =
    createMutation.isPending || createWithItemsMutation.isPending;

  const handleReceiptUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceipt(file);
      setIsScanning(true);
      try {
        const result = await financeService.processReceipt(file);

        // Небольшая задержка для красоты перехода
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (result.items && result.items.length > 0) {
          const newItems = result.items.map(
            (item: {
              name: string;
              amount: number;
              category_suggestion: string | null;
            }) => {
              const suggestedCategory = categories?.find(
                (c) =>
                  c.name.toLowerCase() ===
                  item.category_suggestion?.toLowerCase()
              );
              return {
                id: crypto.randomUUID(),
                amount: String(item.amount),
                category: suggestedCategory || null,
                description: item.name,
              };
            }
          );
          setItems(newItems);
        } else {
          const suggestedCategory = categories?.find(
            (c) =>
              c.name.toLowerCase() === result.category_suggestion?.toLowerCase()
          );
          setItems([
            {
              id: crypto.randomUUID(),
              amount: String(result.total_amount || 0),
              category: suggestedCategory || null,
              description: result.merchant || "Чек",
            },
          ]);
        }

        if (result.date) {
          setDate(new Date(result.date));
        }
        setType("expense");
        toast.success("Чек успешно распознан ✨");
      } catch (error) {
        console.error("Scanning failed:", error);
        toast.error(
          `Ошибка при сканировании: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
        );
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleAddItem = () => {
    setItems([...items, emptyItem()]);
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (items.length === 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof FormItem,
    value: string | Category | null
  ) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId) return;
    if (!isFormValid) return;

    try {
      if (type === "transfer") {
        await createMutation.mutateAsync({
          wallet_id: walletId,
          to_wallet_id: toWalletId,
          amount: Number(items[0].amount),
          type: "transfer",
          description: items[0].description || undefined,
          date: date.toISOString(),
        });
      } else if (type === "expense" && items.length > 1) {
        await createWithItemsMutation.mutateAsync({
          wallet_id: walletId,
          type: "expense",
          date: date.toISOString(),
          description: undefined,
          items: items.map((i) => ({
            category_id: i.category?.id ?? null,
            amount: Number(i.amount),
            description: i.description || null,
          })),
        });
      } else {
        const item = items[0];
        await createMutation.mutateAsync({
          wallet_id: walletId,
          category_id: item.category?.id,
          amount: Number(item.amount),
          type,
          description: item.description || undefined,
          date: date.toISOString(),
          receipt_url: receipt ? URL.createObjectURL(receipt) : undefined,
        });
      }
      setIsOpen(false);
      resetForm();
    } catch {
      // Error handled in mutation onError
    }
  };

  const resetForm = () => {
    setItems([emptyItem()]);
    setReceipt(null);
    setType("expense");
    setDate(new Date());
    setToWalletId("");
    setActiveCategoryItemId(null);
    setStep("form");
  };

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
  };

  const walletOptions = useMemo(
    () =>
      wallets?.map((w) => ({
        value: w.id,
        label: w.name,
        icon: <span className="text-lg">{w.currency}</span>,
      })) || [],
    [wallets]
  );

  const typeOptions = useMemo(() => {
    const options = [
      { id: "expense" as const, label: "Расход" },
      { id: "income" as const, label: "Доход" },
      { id: "transfer" as const, label: "Перевод" },
    ];
    if (!wallets || wallets.length < 2) {
      return options.filter((opt) => opt.id !== "transfer");
    }
    return options;
  }, [wallets]);

  const activeTypeIndex = Math.max(
    0,
    typeOptions.findIndex((opt) => opt.id === type)
  );

  useEffect(() => {
    if (!typeOptions.some((opt) => opt.id === type)) {
      setType("expense");
      setItems([emptyItem()]);
    }
  }, [typeOptions, type]);

  const activeCategoryItem = items.find((i) => i.id === activeCategoryItemId);

  const isFormValid = useMemo(() => {
    if (isPending) return false;
    if (!walletId) return false;

    const amountsValid = items.every(
      (item) => item.amount && Number(item.amount) > 0
    );
    if (!amountsValid) return false;

    if (type === "transfer") {
      return Boolean(toWalletId);
    }

    return true;
  }, [items, walletId, type, toWalletId, isPending]);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105"
      >
        <Plus className="mr-2 h-4 w-4" />
        Добавить
      </Button>

      <AnimatePresence onExitComplete={resetForm}>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="w-full max-w-lg max-h-[80vh] min-h-[560px] bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col relative"
            >
              <ErrorBoundary>
                <div className="flex items-center justify-between p-4 border-b bg-muted/30 shrink-0 z-10 relative">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <h2 className="text-lg font-semibold truncate">
                      {step === "category"
                        ? "Выбор категории"
                        : "Новая операция"}
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="relative flex-1 min-h-0 overflow-hidden">
                  <AnimatePresence>
                    {isScanning && <ScanningOverlay key="scanning" />}
                  </AnimatePresence>

                  <AnimatePresence initial={false} mode="wait">
                    {step === "category" && activeCategoryItem ? (
                      <motion.div
                        key="category-picker"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.32, ease: "easeInOut" }}
                        className="absolute inset-0 bg-background z-20 flex flex-col"
                      >
                        <CategoryPicker
                          type={type === "income" ? "income" : "expense"}
                          onSelect={(cat) => {
                            updateItem(activeCategoryItemId!, "category", cat);
                            setActiveCategoryItemId(null);
                            setStep("form");
                          }}
                          onClose={() => {
                            setActiveCategoryItemId(null);
                            setStep("form");
                          }}
                          selectedId={activeCategoryItem.category?.id}
                          className="h-full"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="main-form"
                        initial={{ x: "-12%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "-12%", opacity: 0 }}
                        transition={{ duration: 0.32, ease: "easeInOut" }}
                        className="h-full flex flex-col"
                      >
                        <form
                          onSubmit={handleSubmit}
                          className="flex flex-col flex-1 min-h-0"
                        >
                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div
                              className={cn(
                                "grid gap-0 p-1 bg-muted rounded-xl relative isolate h-11 shrink-0",
                                typeOptions.length === 2
                                  ? "grid-cols-2"
                                  : "grid-cols-3"
                              )}
                            >
                              <motion.div
                                className="absolute inset-1 bg-background shadow-sm rounded-lg"
                                animate={{ x: `${activeTypeIndex * 100}%` }}
                                transition={{
                                  duration: 0.32,
                                  ease: "easeInOut",
                                }}
                                style={{
                                  inlineSize: `calc(100% / ${typeOptions.length})`,
                                }}
                              />
                              {typeOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    setType(option.id);
                                    setItems([emptyItem()]);
                                  }}
                                  className={cn(
                                    "relative z-10 py-1 text-sm font-medium rounded-lg transition-colors focus:outline-none",
                                    type === option.id
                                      ? "text-foreground"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>

                            <AnimatePresence mode="wait">
                              {type === "expense" && items.length > 1 && (
                                <motion.div
                                  key="positions"
                                  initial={{ opacity: 0, blockSize: 0 }}
                                  animate={{ opacity: 1, blockSize: "auto" }}
                                  exit={{ opacity: 0, blockSize: 0 }}
                                  transition={{
                                    duration: 0.32,
                                    ease: "easeInOut",
                                  }}
                                  className="overflow-hidden"
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium flex items-center gap-2">
                                      <Package className="h-4 w-4" />
                                      Позиции
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      Итого:{" "}
                                      {totalAmount.toLocaleString("ru-RU")} ₽
                                    </span>
                                  </div>

                                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                    {items.map((item, index) => (
                                      <motion.div
                                        key={item.id}
                                        initial={{
                                          opacity: 0,
                                          scale: 0.98,
                                          y: 10,
                                        }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{
                                          opacity: 0,
                                          scale: 0.98,
                                          y: -10,
                                        }}
                                        transition={{
                                          duration: 0.3,
                                          delay: index * 0.05,
                                        }}
                                        className="rounded-xl border border-border/60 bg-background/80 p-4 space-y-3 relative group"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-medium text-muted-foreground">
                                            Позиция #{index + 1}
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={(e) =>
                                              handleRemoveItem(item.id, e)
                                            }
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>

                                        <div className="w-full space-y-3">
                                          <div className="flex gap-2">
                                            <div className="flex-1">
                                              <Input
                                                placeholder="Описание"
                                                value={item.description}
                                                onChange={(e) =>
                                                  updateItem(
                                                    item.id,
                                                    "description",
                                                    e.target.value
                                                  )
                                                }
                                                className="h-9 text-sm"
                                              />
                                            </div>
                                            <div className="w-24">
                                              <Input
                                                type="number"
                                                placeholder="0"
                                                value={item.amount}
                                                onChange={(e) =>
                                                  updateItem(
                                                    item.id,
                                                    "amount",
                                                    e.target.value
                                                  )
                                                }
                                                className="h-9 font-semibold text-right"
                                              />
                                            </div>
                                          </div>
                                          <div
                                            className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => {
                                              setActiveCategoryItemId(item.id);
                                              setStep("category");
                                            }}
                                          >
                                            <span
                                              className={cn(
                                                "text-sm",
                                                !item.category &&
                                                  "text-muted-foreground"
                                              )}
                                            >
                                              {item.category?.name ??
                                                "Выбрать категорию"}
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleAddItem}
                                    className="w-full mt-3 border-dashed border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Добавить еще позицию
                                  </Button>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {(type !== "expense" || items.length === 1) && (
                              <motion.div
                                key="simple"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.24 }}
                                className="space-y-6"
                              >
                                <div className="flex items-center border-b border-input focus-within:border-primary transition-colors relative group">
                                  <span className="text-3xl font-bold mr-2 text-muted-foreground">
                                    ₽
                                  </span>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={items[0]?.amount ?? ""}
                                    onChange={(e) =>
                                      updateItem(
                                        items[0].id,
                                        "amount",
                                        e.target.value
                                      )
                                    }
                                    className="h-16 text-3xl font-bold bg-transparent border-0 rounded-none px-0 shadow-none focus-visible:ring-0"
                                  />
                                  {items[0]?.amount && (
                                    <motion.div
                                      initial={{ opacity: 0, x: 10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="absolute right-0 text-primary/40"
                                    >
                                      <Sparkles className="h-5 w-5" />
                                    </motion.div>
                                  )}
                                </div>

                                {type === "expense" && items.length === 1 && (
                                  <div
                                    className="flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-accent/50 cursor-pointer transition-all active:scale-[0.99]"
                                    onClick={() => {
                                      setActiveCategoryItemId(items[0].id);
                                      setStep("category");
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={cn(
                                          "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                                          items[0].category
                                            ? "text-primary bg-primary/10"
                                            : "bg-muted text-muted-foreground"
                                        )}
                                        style={
                                          items[0].category
                                            ? {
                                                backgroundColor: items[0]
                                                  .category.color
                                                  ? `${items[0].category.color}20`
                                                  : undefined,
                                                color: items[0].category.color,
                                              }
                                            : undefined
                                        }
                                      >
                                        {items[0].category ? (
                                          items[0].category.name[0].toUpperCase()
                                        ) : (
                                          <Search className="h-5 w-5" />
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">
                                          Категория
                                        </span>
                                        <p className="font-medium text-sm truncate max-w-[200px]">
                                          {items[0].category?.name ??
                                            "Не выбрана"}
                                        </p>
                                      </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}

                                {type === "expense" && items.length === 1 && (
                                  <div className="space-y-3">
                                    <FormInput
                                      label="Комментарий"
                                      value={items[0]?.description ?? ""}
                                      onChange={(v) =>
                                        updateItem(
                                          items[0].id,
                                          "description",
                                          v
                                        )
                                      }
                                      placeholder="Например: Продукты"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleAddItem}
                                      className="w-full text-muted-foreground hover:text-foreground h-9"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Разбить на несколько позиций
                                    </Button>
                                  </div>
                                )}
                              </motion.div>
                            )}

                            {type === "income" && (
                              <div className="space-y-4">
                                <div
                                  className="flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-accent/50 cursor-pointer"
                                  onClick={() => {
                                    setActiveCategoryItemId(items[0].id);
                                    setStep("category");
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                                        items[0].category
                                          ? "bg-primary/10 text-primary"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                      style={
                                        items[0].category
                                          ? {
                                              backgroundColor: items[0].category
                                                .color
                                                ? `${items[0].category.color}20`
                                                : undefined,
                                              color: items[0].category.color,
                                            }
                                          : undefined
                                      }
                                    >
                                      {items[0].category ? (
                                        items[0].category.name[0].toUpperCase()
                                      ) : (
                                        <Search className="h-5 w-5" />
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs text-muted-foreground">
                                        Категория
                                      </span>
                                      <p className="font-medium text-sm">
                                        {items[0].category?.name ??
                                          "Не выбрана"}
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <FormInput
                                  label="Комментарий"
                                  value={items[0]?.description ?? ""}
                                  onChange={(v) =>
                                    updateItem(items[0].id, "description", v)
                                  }
                                  placeholder="Зарплата, подарок..."
                                />
                              </div>
                            )}
                          </div>

                          <div className="p-4 border-t bg-muted/20 space-y-4 shrink-0">
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

                            <div className="flex gap-3">
                              <label
                                className={cn(
                                  "flex-1 flex items-center justify-center h-12 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group",
                                  isScanning && "pointer-events-none opacity-80"
                                )}
                              >
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*,.eml"
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
                                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                    <Camera className="h-4 w-4" />
                                    <span className="text-xs font-medium">
                                      Скан чека
                                    </span>
                                  </div>
                                )}
                              </label>
                            </div>

                            <Button
                              type="submit"
                              size="lg"
                              className="w-full rounded-xl text-lg h-12 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              disabled={!isFormValid}
                            >
                              {isPending
                                ? "Добавление..."
                                : `Добавить${isSplit ? ` (${totalAmount.toLocaleString()}₽)` : ""}`}
                            </Button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ErrorBoundary>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper component for inputs
function FormInput({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5 relative group", className)}>
      <label className="text-xs text-muted-foreground ml-1">{label}</label>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-10 rounded-xl transition-all duration-500",
            value && "border-primary/20 bg-primary/5"
          )}
        />
        {value && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40"
          >
            <Sparkles className="h-3 w-3" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
