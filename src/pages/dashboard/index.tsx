import { FadeIn } from "@/components/motion";
import { useAuthStore } from "@/lib/stores/auth-store";

// Заготовка внутреннего дашборда
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const email = user?.email ?? "пользователь";

  return (
    <div className="space-y-8">
      <FadeIn direction="up" distance={12}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Сводка
            </h1>
            <p className="text-muted-foreground mt-1">
              Добро пожаловать обратно, {email.split("@")[0]}
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary font-medium border border-primary/20">
              MVP • В разработке
            </span>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1} direction="up" distance={14}>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Баланс
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">— ₽</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Здесь будет общий баланс по всем счетам.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Этот месяц
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              Доход / Расход
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Позже добавим графики и статистику.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Фокус
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground">
              День без пропусков
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Здесь можно будет видеть ключевые задачи на сегодня.
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.15} direction="up" distance={16}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Последние события
              </h3>
              <span className="text-xs text-muted-foreground">
                Финансы • Здоровье • Задачи
              </span>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Здесь позже появится лента последних транзакций и событий.</p>
              <p>
                Для начала разработки модуля Finance достаточно заменить эту
                секцию компонентами из features/finance.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Черновик списка дел
              </h3>
              <span className="text-xs text-muted-foreground">
                Assistant module
              </span>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Добавить счета и категории</p>
              <p>• Подключить TanStack Query к Supabase</p>
              <p>• Настроить базовую статистику по месяцу</p>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
