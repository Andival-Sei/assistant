import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabaseClient } from "@/lib/db/supabase-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { startGoogleOAuth } from "@/lib/services/auth-oauth-service";
import { getSafeRedirectPath } from "@/lib/utils/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/google-icon";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion";
import { ArrowLeft } from "lucide-react";

interface LocationState {
  from?: string;
}

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function isValidPassword(value: string) {
  return value.length >= 6;
}

// Страница входа по email/паролю
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const authStatus = useAuthStore((s) => s.status);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);

  const emailInvalid = emailTouched && !isValidEmail(email);
  const passwordInvalid = passwordTouched && !isValidPassword(password);
  const isFormValid =
    isValidEmail(email) && isValidPassword(password) && !isSubmitting;

  useEffect(() => {
    if (authStatus === "authenticated") {
      navigate("/dashboard", { replace: true });
    }
  }, [authStatus, navigate]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("link_google") === "1") {
      setOauthMessage(
        "Войдите в существующий аккаунт, затем в Настройках нажмите «Привязать Google»."
      );
    }
  }, [location.search]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isFormValid) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Сообщение показываем пользователю, детали остаются в error
        setErrorMessage(
          error.message === "Invalid login credentials"
            ? "Неверный email или пароль"
            : "Не удалось войти. Попробуйте ещё раз."
        );
        return;
      }

      if (new URLSearchParams(location.search).get("link_google") === "1") {
        await startGoogleOAuth("link", "/dashboard/settings");
        return;
      }

      const redirectTo = getSafeRedirectPath(state?.from);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error("[LoginPage] unexpected signIn error", error);
      setErrorMessage("Произошла неожиданная ошибка. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleSubmitting(true);
    try {
      await startGoogleOAuth("signin", state?.from ?? "/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось начать вход через Google"
      );
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 selection:bg-emerald-500/30">
      {/* 
        Animated Vibrant Background (No-Banding Strategy) 
        Используем анимированные сферы с экстремальным блюром и микро-шум
      */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] animate-pulse rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] animate-pulse rounded-full bg-sky-500/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] h-[40%] w-[40%] animate-bounce rounded-full bg-emerald-500/10 blur-[100px] [animation-duration:8s]" />

        {/* Noise Overlay (Extremely subtle) */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-1 bg-black/20 backdrop-blur-[2px]" />

      {/* Кнопка возврата */}
      <div className="absolute top-8 left-8 z-20">
        <FadeIn delay={0.4}>
          <Link
            to="/"
            className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-card/40 backdrop-blur-sm transition-all group-hover:border-border group-hover:bg-card">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </div>
            <span>Назад на главную</span>
          </Link>
        </FadeIn>
      </div>

      <FadeIn
        delay={0.1}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl backdrop-blur-xl"
      >
        <FadeIn delay={0.15} direction="up" distance={12}>
          <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-foreground">
            Добро пожаловать обратно
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Войдите в Ассистент, чтобы продолжить
          </p>
        </FadeIn>

        <FadeIn delay={0.2} direction="up" distance={16}>
          <div className="space-y-4">
            {oauthMessage && (
              <p className="rounded-md border border-border bg-accent/30 px-3 py-2 text-xs text-muted-foreground">
                {oauthMessage}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting || isSubmitting}
            >
              <GoogleIcon className="h-4 w-4" />
              {isGoogleSubmitting
                ? "Переходим в Google..."
                : "Продолжить с Google"}
            </Button>

            <div className="relative text-center text-xs text-muted-foreground">
              <span className="bg-card px-2">или</span>
              <div className="absolute inset-0 -z-10 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  className={cn(
                    "w-full rounded-lg border bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition",
                    "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                    emailInvalid ? "border-destructive" : "border-input"
                  )}
                />
                {emailInvalid && (
                  <p className="text-xs text-destructive">
                    Введите корректный email
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  className={cn(
                    "w-full rounded-lg border bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition",
                    "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                    passwordInvalid ? "border-destructive" : "border-input"
                  )}
                />
                {passwordInvalid && (
                  <p className="text-xs text-destructive">
                    Минимум 6 символов для безопасности
                  </p>
                )}
              </div>

              {errorMessage && (
                <FadeIn delay={0.05} direction="up" distance={6}>
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </FadeIn>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!isFormValid || isGoogleSubmitting}
              >
                {isSubmitting ? "Входим..." : "Войти"}
              </Button>
            </form>
          </div>
        </FadeIn>

        <FadeIn delay={0.3} direction="up" distance={10}>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link
              to="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Зарегистрироваться
            </Link>
          </p>
        </FadeIn>
      </FadeIn>
    </main>
  );
}
