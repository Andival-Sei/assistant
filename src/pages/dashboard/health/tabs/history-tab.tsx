import { FadeIn } from "@/components/motion";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { HealthHistoryTabProps } from "../health-types";

function providerLabel(
  source: string,
  metadata: Record<string, unknown>
): string {
  if (source === "manual") return "Ручной";
  const provider = String(metadata.provider ?? "");
  if (provider === "google_fit") return "Google Fit";
  if (provider === "fitbit") return "Fitbit";
  if (provider === "health_connect") return "Health Connect";
  if (provider) return provider;
  return "Интеграция";
}

export function HealthHistoryTab({
  entries,
  connectedSyncIntegration,
}: HealthHistoryTabProps) {
  return (
    <div className="space-y-6">
      <FadeIn delay={0.05} direction="up" distance={12}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <h3 className="font-semibold">Состояние синхронизации</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Источник: {connectedSyncIntegration?.name ?? "не подключен"}
            {connectedSyncIntegration?.last_sync_at
              ? ` • последний sync ${format(new Date(connectedSyncIntegration.last_sync_at), "d MMMM, HH:mm", { locale: ru })}`
              : " • синхронизация еще не запускалась"}
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1} direction="up" distance={12}>
        <div className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl">
          <h3 className="mb-4 font-semibold">Последние записи</h3>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Данных пока нет.</p>
          ) : (
            <div className="space-y-3">
              {entries.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-1 rounded-xl border border-border/50 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(entry.recorded_for), "d MMMM yyyy", {
                        locale: ru,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Шаги: {entry.steps ?? "—"} • Сон:{" "}
                      {entry.sleep_hours ?? "—"} ч • Пульс:{" "}
                      {entry.resting_heart_rate ?? "—"} • SpO2:{" "}
                      {entry.oxygen_saturation_pct ?? "—"}% • Глюкоза:{" "}
                      {entry.blood_glucose_mmol_l ?? "—"}
                    </p>
                  </div>
                  <span className="rounded-full border border-border/50 px-2 py-1 text-[11px] text-muted-foreground">
                    {providerLabel(entry.source, entry.metadata)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
