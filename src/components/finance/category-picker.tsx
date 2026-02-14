import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Category } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  Search,
  ChevronLeft,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const IconComponent = ({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) => {
  if (!name) return null;

  const formattedName =
    name.charAt(0).toUpperCase() +
    name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const pascalName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");

  const iconMap = LucideIcons as unknown as Record<string, LucideIcon>;
  const Icon =
    iconMap[formattedName] || iconMap[pascalName] || LucideIcons.HelpCircle;

  return <Icon className={className} />;
};

interface CategoryPickerProps {
  type: "income" | "expense";
  onSelect: (category: Category) => void;
  selectedId?: string;
  onClose: () => void;
  className?: string;
}

export function CategoryPicker({
  type,
  onSelect,
  selectedId,
  onClose,
  className,
}: CategoryPickerProps) {
  const [search, setSearch] = useState("");
  const [parentStack, setParentStack] = useState<Category[]>([]); // For navigation history

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: financeService.getCategories,
    refetchOnMount: "always",
  });

  // Если у типа один корневой уровень с подкатегориями (например "Доходы") — показываем подкатегории сразу
  const effectiveRoot = useMemo(() => {
    if (!categories) return null;
    const byType = categories.filter((c) => c.type === type);
    const roots = byType.filter((c) => (c.parent_id || null) === null);
    if (roots.length !== 1) return null;
    const root = roots[0];
    const hasChildren = byType.some((c) => c.parent_id === root.id);
    return hasChildren ? root : null;
  }, [categories, type]);

  const currentParentId =
    parentStack.length > 0
      ? parentStack[parentStack.length - 1].id
      : (effectiveRoot?.id ?? null);

  // Filter categories based on type, search, and current parent
  const filteredCategories = useMemo(() => {
    if (!categories) return [];

    const filtered = categories.filter((c) => c.type === type);

    if (search.trim()) {
      // If searching, show flat list of matches
      return filtered.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Otherwise show children of current parent (or root items if no parent)
    return filtered.filter((c) => (c.parent_id || null) === currentParentId);
  }, [categories, type, search, currentParentId]);

  const handleCategoryClick = (category: Category) => {
    // Check if this category has children
    const hasChildren = categories?.some((c) => c.parent_id === category.id);

    if (hasChildren && !search) {
      // Drill down
      setParentStack([...parentStack, category]);
    } else {
      // Select leaf or if searching
      onSelect(category);
    }
  };

  const handleBack = () => {
    setParentStack(parentStack.slice(0, -1));
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background overflow-hidden",
        className
      )}
    >
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {parentStack.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="-ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="-ml-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h3 className="font-semibold text-lg">Категории</h3>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {effectiveRoot && parentStack.length === 0 ? (
              <span className="text-foreground font-medium">
                {effectiveRoot.name}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setParentStack([])}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    parentStack.length === 0 && "text-foreground font-medium"
                  )}
                >
                  Главная
                </button>
                {parentStack.map((cat, index) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span className="text-muted-foreground">/</span>
                    <button
                      type="button"
                      onClick={() =>
                        setParentStack(parentStack.slice(0, index + 1))
                      }
                      className={cn(
                        "hover:text-foreground transition-colors",
                        index === parentStack.length - 1 &&
                          "text-foreground font-medium"
                      )}
                    >
                      {cat.name}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50 border-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {categoriesLoading && !categories ? (
          <div className="p-4 text-center text-muted-foreground">
            Загрузка...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {search ? "Ничего не найдено" : "Нет категорий"}
          </div>
        ) : (
          <div className="grid gap-1">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredCategories.map((cat) => {
                const hasChildren =
                  !search && categories.some((c) => c.parent_id === cat.id);
                return (
                  <motion.button
                    type="button"
                    key={cat.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    onClick={() => handleCategoryClick(cat)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group",
                      selectedId === cat.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                          selectedId === cat.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}
                        style={{
                          backgroundColor:
                            selectedId === cat.id
                              ? undefined
                              : cat.color
                                ? `${cat.color}15`
                                : undefined,
                          color:
                            selectedId === cat.id
                              ? undefined
                              : cat.color || undefined,
                        }}
                      >
                        {cat.icon ? (
                          <IconComponent name={cat.icon} className="h-5 w-5" />
                        ) : (
                          <span className="capitalize">{cat.name[0]}</span>
                        )}
                      </div>
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    {hasChildren && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
