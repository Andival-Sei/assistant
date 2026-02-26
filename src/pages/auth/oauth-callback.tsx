import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/db/supabase-client";
import { getSafeRedirectPath } from "@/lib/utils/auth";
import { hasGoogleIdentity } from "@/lib/services/auth-oauth-service";

type CallbackStatus = "loading" | "choose" | "error";

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const search = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const intent = search.get("intent") === "link" ? "link" : "signin";
  const redirectTo = getSafeRedirectPath(search.get("next") ?? "/dashboard");

  useEffect(() => {
    const run = async () => {
      try {
        const oauthError =
          search.get("error_description") ?? search.get("error");
        if (oauthError) {
          setStatus("error");
          setErrorMessage(oauthError);
          return;
        }

        const code = search.get("code");
        const {
          data: { session: currentSession },
        } = await supabaseClient.auth.getSession();

        // В некоторых случаях Supabase уже успевает обменять code автоматически.
        // Тогда повторный exchangeCodeForSession даст PKCE verifier error.
        if (code && !currentSession) {
          const { error } =
            await supabaseClient.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus("error");
            setErrorMessage(error.message);
            return;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
          setStatus("error");
          setErrorMessage(userError?.message ?? "Сессия не найдена");
          return;
        }

        if (intent === "link") {
          navigate("/dashboard/settings?google_linked=1", { replace: true });
          return;
        }

        const { data: identitiesData } =
          await supabaseClient.auth.getUserIdentities();
        const identities = identitiesData?.identities ?? [];
        const googleOnly =
          hasGoogleIdentity(identities) && identities.length === 1;
        const isFreshUser =
          Date.now() - new Date(user.created_at).getTime() < 2 * 60 * 1000;

        if (googleOnly && isFreshUser) {
          setUserEmail(user.email ?? null);
          setStatus("choose");
          return;
        }

        navigate(redirectTo, { replace: true });
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Ошибка OAuth входа"
        );
      }
    };

    void run();
  }, [intent, navigate, redirectTo, search]);

  const handleContinueWithNewAccount = () => {
    navigate(redirectTo, { replace: true });
  };

  const handleLinkExistingAccount = async () => {
    setIsMerging(true);
    try {
      // Удаляем только что созданный Google-only аккаунт, чтобы затем
      // пользователь вошел в существующий email/password и привязал Google.
      const { error } = await supabaseClient.functions.invoke("delete-account");
      if (error) {
        throw new Error(error.message);
      }

      await supabaseClient.auth.signOut({ scope: "local" });
      navigate("/login?link_google=1", { replace: true });
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось подготовить привязку к существующему аккаунту"
      );
    } finally {
      setIsMerging(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">
          Завершаем вход через Google...
        </p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-destructive/40 bg-card p-6">
          <h1 className="text-lg font-semibold text-foreground">
            Ошибка OAuth
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {errorMessage ?? "Не удалось завершить авторизацию через Google"}
          </p>
          <Button
            className="mt-4 w-full"
            onClick={() => navigate("/login", { replace: true })}
          >
            Вернуться ко входу
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">
          Вход через Google выполнен
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Для почты <span className="font-medium">{userEmail ?? "Google"}</span>{" "}
          создан новый аккаунт. Если у вас уже есть профиль в сервисе, можно
          привязать Google к нему.
        </p>

        <div className="mt-5 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLinkExistingAccount}
            disabled={isMerging}
          >
            {isMerging
              ? "Подготавливаем привязку..."
              : "У меня уже есть аккаунт, хочу привязать Google"}
          </Button>
          <Button className="w-full" onClick={handleContinueWithNewAccount}>
            Продолжить с новым аккаунтом
          </Button>
        </div>
      </div>
    </main>
  );
}
