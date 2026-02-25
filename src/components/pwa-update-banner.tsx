import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PwaUpdateBannerProps = {
  open: boolean;
  onUpdate: () => void;
};

export const PwaUpdateBanner = ({ open, onUpdate }: PwaUpdateBannerProps) => {
  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-4 z-50 px-4",
        "flex justify-center"
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-xl items-center justify-between gap-4",
          "rounded-xl border border-emerald-500/40 bg-background/95",
          "px-4 py-3 shadow-lg backdrop-blur"
        )}
      >
        <div className="text-sm">
          <p className="font-medium">Доступна новая версия приложения</p>
          <p className="text-xs text-muted-foreground">
            Обнови, чтобы получить последние улучшения и исправления.
          </p>
        </div>
        <Button size="sm" onClick={onUpdate}>
          Обновить
        </Button>
      </div>
    </div>
  );
};
