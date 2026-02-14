import { FadeIn } from "@/components/motion";
import { Settings as SettingsIcon, Save, Key } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/db/supabase-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [geminiKey, setGeminiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from("user_settings")
          .select("gemini_api_key")
          .maybeSingle();

        if (error) {
          console.error("Error loading settings:", error);
        } else if (data) {
          setGeminiKey(data.gemini_api_key || "");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [user]);

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

        <FadeIn delay={0.2} direction="up" distance={12}>
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
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3} direction="up" distance={12}>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-12 text-center backdrop-blur-sm text-muted-foreground">
            <SettingsIcon className="h-8 w-8 mx-auto mb-4 opacity-20" />
            Другие настройки появятся позже...
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
