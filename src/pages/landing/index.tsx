import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeroSection,
  FeaturesSection,
  StatsSection,
  HowItWorksSection,
  FooterSection,
} from "@/components/landing";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <main className="relative min-h-screen">
      {/* Animated gradient background */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
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
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`light-${i}`}
            className="absolute rounded-full bg-emerald-500/20 blur-3xl dark:hidden"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 10}%`,
            }}
            animate={{
              x: [0, 50, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`dark-${i}`}
            className="hidden dark:block absolute rounded-full bg-emerald-500/10 blur-3xl"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 10}%`,
            }}
            animate={{
              x: [0, 50, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link to="/">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent truncate">
                  Ассистент
                </h1>
              </Link>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <ThemeToggle />
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              <div className="sm:hidden flex items-center gap-1">
                <ThemeToggle />
              </div>
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 sm:px-3 text-xs sm:text-sm h-8 sm:h-9"
                >
                  Вход
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black text-xs sm:text-sm px-2 sm:px-3 md:px-6 h-8 sm:h-9"
                >
                  Регистрация
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        <StatsSection />
        <HowItWorksSection />
        <FooterSection />
      </div>
    </main>
  );
}
