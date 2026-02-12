import { FadeIn } from "@/components/motion";
import { Settings as SettingsIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <FadeIn direction="up" distance={12}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Настройки
        </h1>
        <p className="text-muted-foreground">
          Управление вашим профилем и предпочтениями.
        </p>
      </FadeIn>

      <FadeIn delay={0.1} direction="up" distance={12}>
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Внешний вид
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Тема оформления</p>
                <p className="text-sm text-muted-foreground">
                  Переключение между светлой и темной темами.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center backdrop-blur-sm text-muted-foreground">
            <SettingsIcon className="h-8 w-8 mx-auto mb-4 opacity-20" />
            Другие настройки появятся позже...
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
