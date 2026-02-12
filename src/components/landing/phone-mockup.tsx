import { motion } from "framer-motion";
import { Wallet, Heart, ListTodo, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  { icon: Wallet, label: "Финансы", gradient: "from-emerald-500 to-teal-500" },
  { icon: Heart, label: "Здоровье", gradient: "from-rose-500 to-pink-500" },
  { icon: ListTodo, label: "Списки", gradient: "from-amber-500 to-orange-500" },
  { icon: Users, label: "Семья", gradient: "from-violet-500 to-purple-500" },
];

export function PhoneMockup({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("relative z-20", className)}
      initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
    >
      <motion.div
        animate={{ y: [0, -20, 0], rotateX: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="relative w-[280px] h-[560px] mx-auto rounded-[3rem] p-2 shadow-2xl overflow-hidden"
          style={{
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="dark:hidden absolute inset-0 rounded-[3rem] bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200" />
          <div className="hidden dark:block absolute inset-0 rounded-[3rem] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 dark:bg-black rounded-b-2xl z-10" />

          <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-background">
            <div className="absolute inset-0 p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center text-muted-foreground text-xs">
                <span>9:41</span>
                <div className="flex gap-1">
                  <div className="w-4 h-2 border border-current rounded-sm opacity-60" />
                  <div className="w-6 h-2 border border-current rounded-sm opacity-60" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-foreground mt-2">
                Ассистент
              </h2>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {modules.map((m) => (
                  <div
                    key={m.label}
                    className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2"
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                        m.gradient
                      )}
                    >
                      <m.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex-1 bg-muted/30 rounded-xl border border-border flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Главная</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded-[2.5rem]" />
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/20 rounded-full" />
        </div>

        <div
          className="hidden dark:block absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.2) 30%, transparent 70%)",
          }}
        />
        <div
          className="dark:hidden absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.05) 30%, transparent 70%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
