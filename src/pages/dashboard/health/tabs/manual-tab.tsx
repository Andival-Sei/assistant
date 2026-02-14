import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { HealthManualTabProps } from "../health-types";

export function HealthManualTab({
  form,
  setForm,
  onSave,
  isSaving,
  today,
}: HealthManualTabProps) {
  return (
    <FadeIn delay={0.05} direction="up" distance={14}>
      <form
        onSubmit={onSave}
        className="rounded-3xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl shadow-sm"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Ручной ввод</h2>
            <p className="text-sm text-muted-foreground">
              Вводите метрики вручную, если интеграция недоступна.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(today), "d MMMM yyyy", { locale: ru })}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Вес, кг"
            value={form.weight_kg}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, weight_kg: e.target.value }))
            }
          />
          <Input
            placeholder="Шаги"
            value={form.steps}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, steps: e.target.value }))
            }
          />
          <Input
            placeholder="Сон, часы"
            value={form.sleep_hours}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sleep_hours: e.target.value }))
            }
          />
          <Input
            placeholder="Сон deep, ч"
            value={form.sleep_deep_hours}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sleep_deep_hours: e.target.value }))
            }
          />
          <Input
            placeholder="Сон light, ч"
            value={form.sleep_light_hours}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                sleep_light_hours: e.target.value,
              }))
            }
          />
          <Input
            placeholder="Сон REM, ч"
            value={form.sleep_rem_hours}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sleep_rem_hours: e.target.value }))
            }
          />
          <Input
            placeholder="Сон awake, ч"
            value={form.sleep_awake_hours}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                sleep_awake_hours: e.target.value,
              }))
            }
          />
          <Input
            placeholder="Вода, мл"
            value={form.water_ml}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, water_ml: e.target.value }))
            }
          />
          <Input
            placeholder="Пульс покоя"
            value={form.resting_heart_rate}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                resting_heart_rate: e.target.value,
              }))
            }
          />
          <Input
            placeholder="SpO2, %"
            value={form.oxygen_saturation_pct}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                oxygen_saturation_pct: e.target.value,
              }))
            }
          />
          <Input
            placeholder="Температура, °C"
            value={form.body_temperature_c}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                body_temperature_c: e.target.value,
              }))
            }
          />
          <Input
            placeholder="Глюкоза, mmol/L"
            value={form.blood_glucose_mmol_l}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                blood_glucose_mmol_l: e.target.value,
              }))
            }
          />
          <Input
            placeholder="Reproductive events"
            value={form.reproductive_events_count}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                reproductive_events_count: e.target.value,
              }))
            }
          />
          <Input
            placeholder="Настроение 1-10"
            value={form.mood_score}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, mood_score: e.target.value }))
            }
          />
          <Input
            placeholder="Систолическое"
            value={form.systolic_bp}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, systolic_bp: e.target.value }))
            }
          />
          <Input
            placeholder="Диастолическое"
            value={form.diastolic_bp}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, diastolic_bp: e.target.value }))
            }
          />
        </div>

        <div className="mt-3">
          <Input
            placeholder="Комментарий (необязательно)"
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, note: e.target.value }))
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSaving}>
            <Activity className="mr-2 h-4 w-4" />
            {isSaving ? "Сохраняем..." : "Сохранить за сегодня"}
          </Button>
        </div>
      </form>
    </FadeIn>
  );
}
