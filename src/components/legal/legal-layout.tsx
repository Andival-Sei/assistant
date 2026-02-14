import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FadeIn } from "@/components/motion";

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  effectiveDate: string;
  children: ReactNode;
}

export function LegalLayout({
  title,
  subtitle,
  effectiveDate,
  children,
}: LegalLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-emerald-50/30 dark:hidden"
          animate={{
            background: [
              "linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #ecfdf5 100%)",
              "linear-gradient(135deg, #ffffff 0%, #fafafa 50%, #ffffff 100%)",
              "linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #ecfdf5 100%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="hidden dark:block absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
          animate={{
            background: [
              "linear-gradient(135deg, #0a0a0a 0%, #18181b 50%, #0a0a0a 100%)",
              "linear-gradient(135deg, #18181b 0%, #0a0a0a 50%, #18181b 100%)",
              "linear-gradient(135deg, #0a0a0a 0%, #18181b 50%, #0a0a0a 100%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-zinc-200/50 bg-white/80 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/80">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" />
              На главную
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
          <FadeIn direction="up" distance={14}>
            <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-6 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/50 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                Legal
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base">
                {subtitle}
              </p>
              <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                Дата вступления в силу: {effectiveDate}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.08} direction="up" distance={12}>
            <article className="mt-6 space-y-6 rounded-3xl border border-zinc-200/70 bg-white/80 p-6 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/60 sm:p-10">
              {children}
            </article>
          </FadeIn>
        </section>
      </div>
    </main>
  );
}
