import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, type LucideIcon, Search } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Category } from "@/types/finance";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "sonner";

const CATEGORY_ICONS = [
  "ShoppingBag",
  "Coffee",
  "Car",
  "Home",
  "Heart",
  "Utensils",
  "Zap",
  "Shirt",
  "Train",
  "Plane",
  "Music",
  "Gift",
  "DollarSign",
  "Wallet",
  "CreditCard",
  "Activity",
  "Briefcase",
  "Camera",
  "Film",
  "Gamepad2",
  "Laptop",
  "Library",
  "Map",
  "Package",
  "Phone",
  "Play",
  "Printer",
  "Save",
  "Scissors",
  "Settings",
  "Smile",
  "Star",
  "Trash2",
  "Truck",
  "Tv",
  "Umbrella",
  "Video",
  "Watch",
  "Wifi",
  "Wind",
  "Landmark",
  "TrendingUp",
  "Coins",
  "PiggyBank",
  "HandCoins",
];

const CATEGORY_COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#64748b", // Slate
];

const IconComponent = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const iconMap = LucideIcons as unknown as Record<string, LucideIcon>;
  const Icon = iconMap[name] || LucideIcons.HelpCircle;
  return <Icon className={className} />;
};

interface AddCategoryModalProps {
  onClose: () => void;
  categoryToEdit?: Category | null;
  initialType?: "income" | "expense";
}

export function AddCategoryModal({
  onClose,
  categoryToEdit,
  initialType = "expense",
}: AddCategoryModalProps) {
  const [name, setName] = useState(categoryToEdit?.name || "");
  const [type, setType] = useState<"income" | "expense">(
    categoryToEdit?.type || initialType
  );
  const [icon, setIcon] = useState(categoryToEdit?.icon || "ShoppingBag");
  const [color, setColor] = useState(
    categoryToEdit?.color || CATEGORY_COLORS[0]
  );
  const [parentId, setParentId] = useState<string | null>(
    categoryToEdit?.parent_id || null
  );
  const [searchIcon, setSearchIcon] = useState("");

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: financeService.getCategories,
  });

  const mutation = useMutation({
    mutationFn: (
      data: Omit<Category, "id" | "user_id" | "created_at" | "is_default">
    ) => {
      if (categoryToEdit) {
        return financeService.updateCategory(categoryToEdit.id, data);
      }
      return financeService.createCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
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
      type,
      icon,
      color,
      parent_id: parentId || undefined,
    });
  };

  const filteredIcons = useMemo(() => {
    if (!searchIcon) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter((i) =>
      i.toLowerCase().includes(searchIcon.toLowerCase())
    );
  }, [searchIcon]);

  // Группируем категории для выбора родителя (только того же типа и не текущую категорию)
  const parentOptions = useMemo(() => {
    const options = [
      {
        value: "null",
        label: "Нет (основная категория)",
        icon: <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />,
      },
    ];

    if (!categories) return options;

    const availableParents = categories.filter(
      (c) =>
        c.type === type &&
        c.id !== categoryToEdit?.id &&
        (!c.parent_id || c.parent_id === null) // Только первый уровень для простоты пока
    );

    return [
      ...options,
      ...availableParents.map((c) => ({
        value: c.id,
        label: c.name,
        icon: (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: c.color + "20", color: c.color }}
          >
            <IconComponent name={c.icon || "Circle"} className="w-2.5 h-2.5" />
          </div>
        ),
      })),
    ];
  }, [categories, type, categoryToEdit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-screen relative"
      >
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold">
            {categoryToEdit ? "Редактировать категорию" : "Новая категория"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Предпросмотр */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-2xl border border-dashed border-border/50">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg transition-all duration-300"
              style={{
                backgroundColor: color + "20",
                color: color,
                boxShadow: `0 8px 16px -4px ${color}30`,
              }}
            >
              <IconComponent name={icon} className="h-8 w-8" />
            </div>
            <div className="text-center">
              <span className="font-semibold text-lg block truncate max-w-48">
                {name || "Название"}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {type === "expense" ? "Расход" : "Доход"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium ml-1">Тип</label>
                <div className="flex p-1 bg-muted rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                      type === "expense"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Расход
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                      type === "income"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Доход
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium ml-1">Родитель</label>
                <CustomSelect
                  value={parentId || "null"}
                  onChange={(val) => setParentId(val === "null" ? null : val)}
                  options={parentOptions}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium ml-1">Название</label>
              <Input
                placeholder="Например: Продукты"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl h-12 text-base bg-secondary/30 border-0 focus-visible:ring-1"
                autoFocus
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium">Цвет</label>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  {color}
                </span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                      color === c
                        ? "border-primary scale-110 shadow-md"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && (
                      <Check className="h-4 w-4 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium">Иконка</label>
                <div className="relative w-32">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchIcon}
                    onChange={(e) => setSearchIcon(e.target.value)}
                    className="w-full bg-muted/50 border-0 rounded-lg pl-7 pr-2 py-1 text-xs focus:ring-0 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 max-h-[200px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {filteredIcons.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 border",
                      icon === iconName
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <IconComponent name={iconName} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>

        <div className="p-4 border-t bg-muted/30 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 rounded-xl h-12"
            disabled={mutation.isPending}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || mutation.isPending}
            className="flex-[2] rounded-xl h-12 shadow-lg shadow-primary/20"
          >
            {mutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full" />
                Сохранение...
              </div>
            ) : categoryToEdit ? (
              "Обновить"
            ) : (
              "Создать категорию"
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
