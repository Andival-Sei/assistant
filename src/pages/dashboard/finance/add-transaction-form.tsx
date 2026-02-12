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
} from "lucide-react";
import { TransactionType, Category } from "@/types/finance";
import { CategoryPicker } from "@/components/finance/category-picker";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import { CustomSelect } from "@/components/ui/custom-select";

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
      alert(
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
      alert(
        `Ошибка при сохранении: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
    },
  });

  const isPending =
    createMutation.isPending || createWithItemsMutation.isPending;

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceipt(file);
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
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

    try {
      if (type === "transfer") {
        if (!toWalletId || !items[0].amount) return;
        await createMutation.mutateAsync({
          wallet_id: walletId,
          to_wallet_id: toWalletId,
          amount: Number(items[0].amount),
          type: "transfer",
          description: items[0].description || undefined,
          date: date.toISOString(),
        });
      } else if (type === "expense" && items.length > 1) {
        const validItems = items.filter(
          (i) => i.amount && Number(i.amount) > 0
        );
        if (validItems.length === 0) return;
        await createWithItemsMutation.mutateAsync({
          wallet_id: walletId,
          type: "expense",
          date: date.toISOString(),
          description: undefined,
          items: validItems.map((i) => ({
            category_id: i.category?.id ?? null,
            amount: Number(i.amount),
            description: i.description || null,
          })),
        });
      } else {
        const item = items[0];
        if (!item.amount) return;
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
    setActiveCategoryItemId(null);
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

  const activeCategoryItem = items.find((i) => i.id === activeCategoryItemId);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        layout
      >
        <ErrorBoundary>
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold">
              {step === "category" ? "Выбор категории" : "Новая операция"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
            <AnimatePresence mode="wait">
              {step === "category" && activeCategoryItem ? (
                <motion.div
                  key="category-picker"
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="h-full flex flex-col overflow-hidden"
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
                  />
                </motion.div>
              ) : (
                <form
                  key="main-form"
                  onSubmit={handleSubmit}
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                >
                  <motion.div
                    key={`main-form-${type}`}
                    initial={{ x: step === "form" ? 0 : "-100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "-100%", opacity: 0 }}
                    className="p-6 space-y-6"
                  >
                    <LayoutGroup>
                      <div className="flex p-1 bg-muted rounded-xl relative isolate h-11">
                        {(["expense", "income", "transfer"] as const)
                          .filter(
                            (t) =>
                              t !== "transfer" ||
                              (wallets && wallets.length >= 2)
                          )
                          .map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setType(t);
                                setItems([emptyItem()]);
                              }}
                              className={cn(
                                "relative flex-1 py-1 text-sm font-medium rounded-lg transition-colors"
                              )}
                            >
                              <AnimatePresence>
                                {type === t && (
                                  <motion.div
                                    layoutId="type-tab"
                                    className="absolute inset-0 bg-background shadow-sm rounded-lg"
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 30,
                                    }}
                                    style={{ zIndex: 0 }}
                                  />
                                )}
                              </AnimatePresence>
                              <span
                                className={cn(
                                  "relative z-10",
                                  type === t
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {t === "expense"
                                  ? "Расход"
                                  : t === "income"
                                    ? "Доход"
                                    : "Перевод"}
                              </span>
                            </button>
                          ))}
                      </div>
                    </LayoutGroup>

                    {/* Позиции расходов — только когда 2+ позиции */}
                    <AnimatePresence mode="wait">
                      {type === "expense" && items.length > 1 ? (
                        <motion.div
                          key="positions"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Позиции
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Итого: {totalAmount.toLocaleString("ru-RU")} ₽
                            </span>
                          </div>

                          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                            <AnimatePresence mode="popLayout">
                              {items.map((item, index) => (
                                <motion.div
                                  key={item.id}
                                  layout
                                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{
                                    opacity: 0,
                                    height: 0,
                                    scale: 0.98,
                                    transition: { duration: 0.2 },
                                  }}
                                  className="rounded-xl border border-border/60 bg-background/80 p-4 space-y-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-medium text-muted-foreground shrink-0 pt-2">
                                      #{index + 1}
                                    </span>
                                    {items.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={(e) =>
                                          handleRemoveItem(item.id, e)
                                        }
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="grid gap-3">
                                    <div className="flex gap-2 items-end">
                                      <div className="flex-1">
                                        <label className="text-xs text-muted-foreground block mb-1">
                                          Описание
                                        </label>
                                        <Input
                                          placeholder="Молоко, Хлеб..."
                                          value={item.description}
                                          onChange={(e) =>
                                            updateItem(
                                              item.id,
                                              "description",
                                              e.target.value
                                            )
                                          }
                                          className="h-9"
                                        />
                                      </div>
                                      <div className="w-24">
                                        <label className="text-xs text-muted-foreground block mb-1">
                                          Сумма
                                        </label>
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
                                          className="h-9 font-semibold"
                                        />
                                      </div>
                                    </div>
                                    <div
                                      className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                      onClick={() => {
                                        setActiveCategoryItemId(item.id);
                                        setStep("category");
                                      }}
                                    >
                                      <span className="text-sm">
                                        {item.category?.name ?? "Категория"}
                                      </span>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddItem}
                            className="w-full border-dashed"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить позицию
                          </Button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    {/* Простой ввод: income, transfer, или expense с 1 позицией */}
                    {(type !== "expense" || items.length === 1) && (
                      <motion.div
                        key="simple"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center border-b border-input focus-within:border-primary transition-colors">
                          <span className="text-3xl font-bold mr-2">₽</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={items[0]?.amount ?? ""}
                            onChange={(e) =>
                              updateItem(items[0].id, "amount", e.target.value)
                            }
                            className="h-16 text-3xl font-bold bg-transparent border-0 rounded-none px-0 shadow-none focus-visible:ring-0"
                          />
                        </div>

                        {type === "expense" && items.length === 1 && (
                          <div
                            className="flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-accent/50 cursor-pointer transition-all"
                            onClick={() => {
                              setActiveCategoryItemId(items[0].id);
                              setStep("category");
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-full flex items-center justify-center",
                                  items[0].category
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {items[0].category ? (
                                  items[0].category.name[0].toUpperCase()
                                ) : (
                                  <Search className="h-4 w-4" />
                                )}
                              </div>
                              <p className="font-medium text-sm">
                                {items[0].category?.name ??
                                  "Выберите категорию"}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}

                        {type === "expense" && items.length === 1 && (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground ml-1">
                                Комментарий
                              </label>
                              <Input
                                placeholder="Например: Продукты в Пятерочке"
                                value={items[0]?.description ?? ""}
                                onChange={(e) =>
                                  updateItem(
                                    items[0].id,
                                    "description",
                                    e.target.value
                                  )
                                }
                                className="h-10 rounded-xl"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleAddItem}
                              className="w-full text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Разбить на несколько позиций
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Income: категория и комментарий */}
                    {type === "income" && (
                      <>
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
                                "h-9 w-9 rounded-full flex items-center justify-center",
                                items[0].category
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {items[0].category ? (
                                items[0].category.name[0].toUpperCase()
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                            </div>
                            <p className="font-medium text-sm">
                              {items[0].category?.name ?? "Категория"}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground ml-1">
                            Комментарий
                          </label>
                          <Input
                            placeholder="Зарплата, подарок..."
                            value={items[0]?.description ?? ""}
                            onChange={(e) =>
                              updateItem(
                                items[0].id,
                                "description",
                                e.target.value
                              )
                            }
                            className="h-10 rounded-xl"
                          />
                        </div>
                      </>
                    )}
                  </motion.div>

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
                          "flex-1 flex items-center justify-center h-12 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer",
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
                          <div className="flex items-center gap-2 text-muted-foreground">
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
                      className="w-full rounded-xl text-lg h-12 shadow-lg shadow-primary/20"
                      disabled={
                        !items.some((i) => i.amount) ||
                        !walletId ||
                        (type === "transfer" && !toWalletId) ||
                        isPending
                      }
                    >
                      {isPending
                        ? "Добавление..."
                        : `Добавить${isSplit ? ` (${totalAmount}₽)` : ""}`}
                    </Button>
                  </div>
                </form>
              )}
            </AnimatePresence>
          </div>
        </ErrorBoundary>
      </motion.div>
    </div>
  );
}
