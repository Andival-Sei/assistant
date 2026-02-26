import { FadeIn } from "@/components/motion";
import {
  Settings as SettingsIcon,
  Save,
  Key,
  User as UserIcon,
  Mail,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabaseClient } from "@/lib/db/supabase-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  hasGoogleIdentity,
  startGoogleOAuth,
} from "@/lib/services/auth-oauth-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/auth/google-icon";

export function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [geminiKey, setGeminiKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!user) {
        setHasLoadedSettings(false);
        return;
      }

      setHasLoadedSettings(false);
      setIsLoading(true);
      try {
        setGeminiKey("");
        setDisplayName("");
        setEmail(user.email ?? "");
        setIsGoogleLinked(false);

        const { data: profileData, error: profileError } = await supabaseClient
          .from("user_profiles")
          .select("display_name")
          .maybeSingle();

        if (profileError) {
          console.error("Error loading profile:", profileError);
        } else if (profileData) {
          setDisplayName(profileData.display_name || "");
        }

        const { data, error } = await supabaseClient
          .from("user_settings")
          .select("gemini_api_key")
          .maybeSingle();

        if (error) {
          console.error("Error loading settings:", error);
        } else if (data) {
          setGeminiKey(data.gemini_api_key || "");
        }

        const { data: identitiesData, error: identitiesError } =
          await supabaseClient.auth.getUserIdentities();
        if (identitiesError) {
          console.error("Error loading linked identities:", identitiesError);
        } else {
          setIsGoogleLinked(hasGoogleIdentity(identitiesData?.identities));
        }
      } finally {
        setIsLoading(false);
        setHasLoadedSettings(true);
      }
    }

    loadSettings();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("google_linked") !== "1") return;

    toast.success("Google аккаунт успешно привязан");
    params.delete("google_linked");
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabaseClient.from("user_settings").upsert(
        {
          user_id: user.id,
          gemini_api_key: geminiKey,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        toast.error("Ошибка при сохранении: " + error.message);
      } else {
        toast.success("Настройки сохранены!");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    setIsSigningOutAll(true);
    try {
      await logout("global");
      toast.success("Вы вышли со всех устройств");
    } finally {
      setIsSigningOutAll(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirm.trim().toLowerCase() !== "удалить") {
      toast.error("Введите слово 'удалить' для подтверждения");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const { error } = await supabaseClient.functions.invoke("delete-account");
      if (error) {
        toast.error("Не удалось удалить аккаунт: " + error.message);
        return;
      }

      toast.success("Аккаунт удалён");
      await logout();
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleLinkGoogleAccount = async () => {
    setIsLinkingGoogle(true);
    try {
      await startGoogleOAuth("link", "/dashboard/settings");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось запустить привязку Google"
      );
      setIsLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogleAccount = async () => {
    setIsUnlinkingGoogle(true);
    try {
      const { data, error } = await supabaseClient.auth.getUserIdentities();
      if (error) {
        throw error;
      }

      const googleIdentity = (data?.identities ?? []).find(
        (identity) => identity.provider === "google"
      );

      if (!googleIdentity) {
        toast.info("Google уже не привязан");
        setIsGoogleLinked(false);
        return;
      }

      const { error: unlinkError } =
        await supabaseClient.auth.unlinkIdentity(googleIdentity);

      if (unlinkError) {
        throw unlinkError;
      }

      setIsGoogleLinked(false);
      toast.success("Google аккаунт отвязан");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось отвязать Google";
      toast.error(message);
    } finally {
      setIsUnlinkingGoogle(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const trimmed = displayName.trim();
      if (trimmed.length === 0) {
        toast.error("Имя не может быть пустым");
        return;
      }

      const { error } = await supabaseClient.from("user_profiles").upsert(
        {
          user_id: user.id,
          display_name: trimmed,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        toast.error("Ошибка при сохранении профиля: " + error.message);
      } else {
        toast.success("Профиль обновлён!");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!user) return;
    setIsSavingEmail(true);
    try {
      const nextEmail = email.trim();
      if (!nextEmail) {
        toast.error("Почта не может быть пустой");
        return;
      }

      const { error } = await supabaseClient.auth.updateUser({
        email: nextEmail,
      });
      if (error) {
        toast.error("Ошибка при смене почты: " + error.message);
        return;
      }

      toast.success(
        "Запрос на смену почты отправлен. Проверьте письмо для подтверждения (если включено подтверждение email)."
      );
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSavePassword = async () => {
    if (!user) return;
    setIsSavingPassword(true);
    try {
      if (newPassword.length < 8) {
        toast.error("Пароль должен быть минимум 8 символов");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Пароли не совпадают");
        return;
      }

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error("Ошибка при смене пароля: " + error.message);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      toast.success("Пароль обновлён!");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const shouldShowSkeletons = Boolean(user) && !hasLoadedSettings;

  return (
    <div className="space-y-6">
      <FadeIn direction="up" distance={12}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Настройки
        </h1>
        <p className="text-muted-foreground">
          Управление вашим профилем и предпочтениями.
        </p>
      </FadeIn>

      <div className="grid gap-6">
        <FadeIn delay={0.1} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Профиль
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Имя</label>
                {shouldShowSkeletons ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32 shrink-0" />
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveProfile();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Как к вам обращаться?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isLoading || isSavingProfile}
                      autoComplete="name"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || isSavingProfile}
                      className="shrink-0"
                    >
                      {isSavingProfile ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Сохранить
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Почта
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Email
                </label>
                {shouldShowSkeletons ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-28 shrink-0" />
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEmail();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || isSavingEmail}
                      autoComplete="email"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || isSavingEmail}
                      className="shrink-0"
                    >
                      {isSavingEmail ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Сменить
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Пароль
            </h3>
            <div className="space-y-4">
              {shouldShowSkeletons ? (
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-44" />
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSavePassword();
                  }}
                  className="grid gap-3"
                >
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Новый пароль
                    </label>
                    <Input
                      type="password"
                      placeholder="Минимум 8 символов"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading || isSavingPassword}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Повторите пароль
                    </label>
                    <Input
                      type="password"
                      placeholder="Повторите новый пароль"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading || isSavingPassword}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <Button
                      type="submit"
                      disabled={isLoading || isSavingPassword}
                    >
                      {isSavingPassword ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Обновить пароль
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Внешний вид
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Тема оформления</p>
                <p className="text-sm text-muted-foreground">
                  Переключение между светлой и темной темами.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.25} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Key className="h-5 w-5" />
              Интеграции
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Gemini API Key
                </label>
                {shouldShowSkeletons ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Skeleton className="h-10 flex-1" />
                      <Skeleton className="h-10 w-32 shrink-0" />
                    </div>
                    <Skeleton className="h-3 w-[70%]" />
                  </div>
                ) : (
                  <>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        type="password"
                        placeholder="Введите ваш API ключ..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        disabled={isLoading || isSaving}
                        autoComplete="current-password"
                      />
                      <Button
                        type="submit"
                        disabled={isLoading || isSaving}
                        className="shrink-0"
                      >
                        {isSaving ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Сохранить
                      </Button>
                    </form>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ключ необходим для автоматического распознавания чеков. Вы
                      можете получить его бесплатно в{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Google AI Studio
                      </a>
                      .
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.35} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center backdrop-blur-sm text-muted-foreground">
            <SettingsIcon className="h-8 w-8 mx-auto mb-4 opacity-20" />
            Другие настройки появятся позже...
          </div>
        </FadeIn>

        <FadeIn delay={0.4} direction="up" distance={12}>
          <div className="rounded-2xl border border-destructive/30 bg-card/50 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Безопасность
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Google аккаунт</p>
                  <div className="text-sm text-muted-foreground">
                    {shouldShowSkeletons ? (
                      <Skeleton className="mt-2 h-3 w-64" />
                    ) : isGoogleLinked ? (
                      "Google уже привязан к вашему аккаунту."
                    ) : (
                      "Привяжите Google, чтобы входить в один клик."
                    )}
                  </div>
                </div>
                {shouldShowSkeletons ? (
                  <Skeleton className="h-10 w-44 shrink-0" />
                ) : isGoogleLinked ? (
                  <Button
                    variant="outline"
                    onClick={handleUnlinkGoogleAccount}
                    disabled={isUnlinkingGoogle}
                    className="shrink-0"
                  >
                    {isUnlinkingGoogle ? "Отвязываем..." : "Отвязать"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleLinkGoogleAccount}
                    disabled={isLinkingGoogle}
                    className="shrink-0"
                  >
                    <GoogleIcon className="h-4 w-4" />
                    {isLinkingGoogle ? "Переход..." : "Привязать Google"}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Выйти со всех устройств</p>
                  <p className="text-sm text-muted-foreground">
                    Завершит все активные сессии вашего аккаунта.
                  </p>
                </div>
                {shouldShowSkeletons ? (
                  <Skeleton className="h-10 w-24 shrink-0" />
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleSignOutAllDevices}
                    disabled={isSigningOutAll}
                    className="shrink-0"
                  >
                    {isSigningOutAll ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : null}
                    Выйти
                  </Button>
                )}
              </div>

              <div className="border-t border-border/50 pt-4">
                <p className="font-medium text-destructive">
                  Удаление аккаунта
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Это действие необратимо. Чтобы подтвердить, введите слово
                  "удалить".
                </p>
                {shouldShowSkeletons ? (
                  <div className="mt-3 flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-28 shrink-0" />
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="Введите: удалить"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      disabled={isDeletingAccount}
                    />
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="shrink-0"
                    >
                      {isDeletingAccount ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : null}
                      Удалить
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
