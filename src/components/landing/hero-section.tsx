import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PhoneMockup } from "./phone-mockup";
import { FadeIn } from "@/components/motion";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 sm:pt-20">
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left space-y-8">
            <FadeIn delay={0.2}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400 bg-clip-text text-transparent">
                  Ассистент
                </span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.4}>
              <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto lg:mx-0">
                Финансы, здоровье, списки и семья — всё в одном приложении.
                Управляйте жизнью с умом.
              </p>
            </FadeIn>
            <FadeIn
              delay={0.6}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black text-lg px-8 py-6 shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70 transition-all duration-300"
                >
                  Начать бесплатно
                </Button>
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto flex justify-center"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-emerald-500/50 text-zinc-700 dark:text-white hover:bg-emerald-500/10 text-lg px-8 py-6 backdrop-blur-sm bg-white/50 dark:bg-zinc-900/50"
                >
                  Войти
                </Button>
              </Link>
            </FadeIn>
          </div>
          <div className="flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
