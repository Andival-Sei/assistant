import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCcw,
  Search,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

export function CategoriesTab() {
  const [search, setSearch] = useState("");
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

  const filteredCategories = categories?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card/30 p-4 rounded-2xl border border-border/50 backdrop-blur-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск категорий..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-0"
          />
        </div>
        <div className="flex items-center gap-2">
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
              Загрузить базовые
            </Button>
          ) : null}
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCategories?.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center justify-between p-4 rounded-2xl bg-card/30 border border-border/50 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-xl transition-colors"
                  style={{
                    backgroundColor: cat.color ? `${cat.color}15` : undefined,
                    color: cat.color || undefined,
                  }}
                >
                  {cat.icon ? (
                    <IconComponent name={cat.icon} className="h-6 w-6" />
                  ) : (
                    <span className="capitalize">{cat.name[0]}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {cat.type === "expense" ? "Расход" : "Доход"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
