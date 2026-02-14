import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import type { HealthIntegrationsTabProps } from "../health-types";
import { Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

function statusLabel(status: string): string {
  if (status === "connected") return "Подключено";
  if (status === "pending") return "Ожидает подключения";
  if (status === "error") return "Ошибка";
  if (status === "revoked") return "Отключено";
  return "Не подключено";
}

function isComingSoonProvider(provider: string): boolean {
  return provider === "health_connect";
}

function methodLabel(method: string): string {
  if (method === "oauth_api") return "OAuth API";
  if (method === "mobile_bridge") return "Mobile Bridge (Android)";
  return "Browser API";
}

export function HealthIntegrationsTab({
  integrations,
  connectingProvider,
  isRequestPending,
  onConnectProvider,
}: HealthIntegrationsTabProps) {
  return (
    <FadeIn delay={0.05} direction="up" distance={14}>
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Интеграции</h2>
            <p className="text-sm text-muted-foreground">
              Подключение носимых устройств и health APIs.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
            MVP
          </span>
        </div>

        <div className="space-y-3">
          {integrations.map((item) => (
            <div
              key={item.provider}
              className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{item.name}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.shortDescription}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {methodLabel(item.syncMethod)} • {statusLabel(item.status)}
                </p>
              </div>
              <Button
                variant={item.status === "connected" ? "outline" : "default"}
                size="sm"
                disabled={
                  isRequestPending ||
                  connectingProvider === item.provider ||
                  isComingSoonProvider(item.provider) ||
                  (item.syncMethod === "oauth_api" &&
                    item.provider !== "fitbit" &&
                    item.provider !== "google_fit")
                }
                onClick={() =>
                  void onConnectProvider(item).catch((error: Error) => {
                    toast.error(
                      error.message || "Не удалось запустить интеграцию"
                    );
                  })
                }
                className="sm:min-w-36"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {connectingProvider === item.provider
                  ? "Подключаем..."
                  : isComingSoonProvider(item.provider)
                    ? "В разработке"
                    : item.syncMethod === "oauth_api" &&
                        item.provider !== "fitbit" &&
                        item.provider !== "google_fit"
                      ? "Скоро"
                      : item.status === "connected"
                        ? "Переподключить"
                        : "Подключить"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}
