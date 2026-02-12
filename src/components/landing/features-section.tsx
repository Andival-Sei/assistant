import { motion } from "framer-motion";
import { Wallet, Heart, ListTodo, Users } from "lucide-react";
import { ScrollFadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

const features = [
  {
    key: "finance",
    icon: Wallet,
    gradient: "from-emerald-500 to-teal-500",
    bgGradient: "from-emerald-500/10 to-teal-500/10",
    title: "Финансы",
    description:
      "Учёт доходов и расходов, статистика и подсказки, что изменить",
  },
  {
    key: "health",
    icon: Heart,
    gradient: "from-rose-500 to-pink-500",
    bgGradient: "from-rose-500/10 to-pink-500/10",
    title: "Здоровье",
    description: "Показатели здоровья и рекомендации на основе данных",
  },
  {
    key: "assistant",
    icon: ListTodo,
    gradient: "from-amber-500 to-orange-500",
    bgGradient: "from-amber-500/10 to-orange-500/10",
    title: "Помощник",
    description: "Списки покупок, напоминания и уведомления",
  },
  {
    key: "family",
    icon: Users,
    gradient: "from-violet-500 to-purple-500",
    bgGradient: "from-violet-500/10 to-purple-500/10",
    title: "Семья",
    description: "Объединяйтесь в семьи и смотрите общие показатели",
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollFadeIn className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            Возможности
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Всё, что нужно для управления финансами, здоровьем и повседневными
            делами
          </p>
        </ScrollFadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <ScrollFadeIn key={f.key} delay={i * 0.1}>
                <motion.div
                  className={cn(
                    "relative group p-8 rounded-2xl border backdrop-blur-xl",
                    "bg-gradient-to-br",
                    f.bgGradient,
                    "border-zinc-200/50 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/30",
                    "bg-white/50 dark:bg-zinc-900/30",
                    "transition-all duration-300 h-full flex flex-col"
                  )}
                  whileHover={{ scale: 1.02, y: -4 }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-2xl",
                      f.gradient
                    )}
                    style={{ zIndex: -1 }}
                  />
                  <div className="mb-6 flex items-center gap-3">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                        f.gradient,
                        "shadow-lg shadow-black/50"
                      )}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                      {f.title}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed flex-1">
                      {f.description}
                    </p>
                  </div>
                </motion.div>
              </ScrollFadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
