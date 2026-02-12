import { ScrollFadeIn } from "@/components/motion";
import { Shield, Zap, Lock } from "lucide-react";

const benefits = [
  {
    key: "secure",
    icon: Shield,
    gradient: "from-emerald-500 to-teal-500",
    title: "Безопасность",
    description: "Данные защищены современными методами шифрования",
  },
  {
    key: "fast",
    icon: Zap,
    gradient: "from-cyan-500 to-blue-500",
    title: "Скорость",
    description: "Быстрая работа и мгновенная навигация",
  },
  {
    key: "private",
    icon: Lock,
    gradient: "from-violet-500 to-purple-500",
    title: "Конфиденциальность",
    description: "Ваши данные остаются только у вас",
  },
] as const;

export function StatsSection() {
  return (
    <section className="relative py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <ScrollFadeIn key={b.key} delay={i * 0.1}>
                <div className="text-center space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100/50 to-zinc-200/50 dark:from-zinc-800/50 dark:to-zinc-900/50 border border-zinc-300/50 dark:border-white/10 backdrop-blur-sm" />
                    <div
                      className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${b.gradient} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {b.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {b.description}
                  </p>
                </div>
              </ScrollFadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
