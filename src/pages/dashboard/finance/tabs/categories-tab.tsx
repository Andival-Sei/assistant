import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCcw,
  Search,
  ChevronRight,
  Edit2,
  Trash2,
  type LucideIcon,
  ChevronDown,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AddCategoryModal } from "../add-category-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Category } from "@/types/finance";
import { AnimatePresence, motion } from "framer-motion";

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

import { Skeleton } from "@/components/ui/skeleton";

export function CategoriesTab() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: financeService.getCategories,
  });

  const seedMutation = useMutation({
    mutationFn: () => financeService.seedDefaultCategories(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCategoryToDelete(null);
    },
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    let filtered = categories.filter((c) => c.type === activeTab);

    if (search.trim()) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [categories, activeTab, search]);

  const rootCategories = useMemo(() => {
    if (search.trim()) return filteredCategories;
    return filteredCategories.filter((c) => !c.parent_id);
  }, [filteredCategories, search]);

  const getSubcategories = (parentId: string) => {
    return filteredCategories.filter((c) => c.parent_id === parentId);
  };

  const renderCategoryCard = (cat: Category, isSub = false) => {
    const subs = getSubcategories(cat.id);
    const hasSubs = subs.length > 0;
    const isExpanded = expandedIds.has(cat.id);

    return (
      <div key={cat.id} className="space-y-2">
        <div
          className={cn(
            "group relative flex items-center justify-between p-4 rounded-2xl border border-border/50 transition-all hover:shadow-md cursor-pointer",
            isSub
              ? "bg-card/10 ml-6 min-h-[72px]"
              : "bg-card/30 hover:border-primary/50 min-h-[82px]"
          )}
          onClick={() => {
            setCategoryToEdit(cat);
            setIsAddModalOpen(true);
          }}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className={cn(
                "shrink-0 rounded-xl flex items-center justify-center transition-colors",
                isSub ? "h-10 w-10 text-lg" : "h-12 w-12 text-xl"
              )}
              style={{
                backgroundColor: cat.color ? `${cat.color}15` : undefined,
                color: cat.color || undefined,
              }}
            >
              {cat.icon ? (
                <IconComponent
                  name={cat.icon}
                  className={isSub ? "h-5 w-5" : "h-6 w-6"}
                />
              ) : (
                <span className="capitalize">{cat.name[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  "font-semibold text-foreground truncate",
                  isSub ? "text-sm" : "text-base"
                )}
                title={cat.name}
              >
                {cat.name}
              </h3>
              {!isSub && hasSubs && !search && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                  {subs.length} подкатегорий
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {!search && hasSubs && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={(e) => toggleExpand(cat.id, e)}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </Button>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setCategoryToEdit(cat);
                  setIsAddModalOpen(true);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setCategoryToDelete(cat);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {!hasSubs && (
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
        </div>

        {!search && isExpanded && hasSubs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-2 py-1">
              {subs.map((sub) => renderCategoryCard(sub, true))}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 bg-card/30 p-4 rounded-3xl border border-border/50 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex p-1 bg-muted/50 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("expense")}
              className={cn(
                "px-4 sm:px-6 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap flex-shrink-0",
                activeTab === "expense"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Расходы
            </button>
            <button
              onClick={() => setActiveTab("income")}
              className={cn(
                "px-4 sm:px-6 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap flex-shrink-0",
                activeTab === "income"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Доходы
            </button>
          </div>
          <Button
            onClick={() => {
              setCategoryToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск категорий..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-background/50 border-0 h-11 rounded-2xl focus-visible:ring-1"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-[82px] rounded-2xl border border-border/50 bg-card/30 p-4 backdrop-blur-xl flex items-center gap-4"
            >
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card/10 rounded-3xl border border-dashed border-border/50">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Категории не найдены</h3>
          <p className="text-muted-foreground max-w-xs mb-6">
            {search
              ? `По запросу "${search}" ничего не найдено`
              : "У вас пока нет категорий для этого типа операций"}
          </p>
          {!categories || categories.length === 0 ? (
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              variant="outline"
              className="rounded-xl"
            >
              <RefreshCcw
                className={cn(
                  "mr-2 h-4 w-4",
                  seedMutation.isPending && "animate-spin"
                )}
              />
              Загрузить базовые категории
            </Button>
          ) : (
            <Button
              onClick={() => {
                setCategoryToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Создать первую
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {rootCategories.map((cat) => renderCategoryCard(cat))}
        </div>
      )}

      <AnimatePresence>
        {isAddModalOpen && (
          <AddCategoryModal
            onClose={() => setIsAddModalOpen(false)}
            categoryToEdit={categoryToEdit}
            initialType={activeTab}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() =>
          categoryToDelete && deleteMutation.mutate(categoryToDelete.id)
        }
        title="Удалить категорию?"
        description={`Вы уверены, что хотите удалить категорию "${categoryToDelete?.name}"? Это действие нельзя будет отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  );
}
