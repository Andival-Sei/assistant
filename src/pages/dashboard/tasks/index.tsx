import { FadeIn } from "@/components/motion";
import { CheckSquare } from "lucide-react";

export function TasksPage() {
  return (
    <div className="space-y-6">
      <FadeIn direction="up" distance={12}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Задачи
        </h1>
        <p className="text-muted-foreground">
          Здесь будут ваши дела и фокус дня.
        </p>
      </FadeIn>

      <FadeIn delay={0.1} direction="up" distance={12}>
        <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CheckSquare className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-foreground">
            Модуль Задач в разработке
          </h3>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
            Мы работаем над супер-удобным таск-менеджером с AI ассистентом.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
