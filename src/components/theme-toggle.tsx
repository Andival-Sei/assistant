import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) return null;

  return (
    <div className="flex items-center rounded-full border border-border bg-background p-0.5 sm:p-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "rounded-full p-1.5 sm:p-2 transition-all",
          theme === "light"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Светлая тема"
      >
        <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={cn(
          "rounded-full p-1.5 sm:p-2 transition-all hidden sm:block",
          theme === "system"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Системная тема"
      >
        <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "rounded-full p-1.5 sm:p-2 transition-all",
          theme === "dark"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Тёмная тема"
      >
        <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}
