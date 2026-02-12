import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Category } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search, ChevronLeft, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CategoryPickerProps {
  type: "income" | "expense";
  onSelect: (category: Category) => void;
  selectedId?: string;
  onClose: () => void;
}

export function CategoryPicker({
  type,
  onSelect,
  selectedId,
  onClose,
}: CategoryPickerProps) {
  const [search, setSearch] = useState("");
  const [parentStack, setParentStack] = useState<Category[]>([]); // For navigation history

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: financeService.getCategories,
  });

  const currentParentId =
    parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null;

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
    <div className="flex flex-col h-full bg-background rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
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
          <h3 className="font-semibold text-lg">
            {parentStack.length > 0
              ? parentStack[parentStack.length - 1].name
              : "Выберите категорию"}
          </h3>
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

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {!categories ? (
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
                          "h-10 w-10 rounded-full flex items-center justify-center text-lg transition-colors",
                          selectedId === cat.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}
                      >
                        {/* We could use an icon library mapping here, but for now using first letter or generic icon */}
                        {/* Ideally we use the 'icon' field from DB mapped to Lucide */}
                        <span className="capitalize">{cat.name[0]}</span>
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
