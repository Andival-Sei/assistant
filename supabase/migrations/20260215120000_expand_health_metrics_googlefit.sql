-- Expand health metrics schema for extended Google Fit read scopes

alter table public.health_metric_entries
  add column if not exists sleep_deep_hours numeric(4, 2)
    check (sleep_deep_hours is null or (sleep_deep_hours >= 0 and sleep_deep_hours <= 24)),
  add column if not exists sleep_light_hours numeric(4, 2)
    check (sleep_light_hours is null or (sleep_light_hours >= 0 and sleep_light_hours <= 24)),
  add column if not exists sleep_rem_hours numeric(4, 2)
    check (sleep_rem_hours is null or (sleep_rem_hours >= 0 and sleep_rem_hours <= 24)),
  add column if not exists sleep_awake_hours numeric(4, 2)
    check (sleep_awake_hours is null or (sleep_awake_hours >= 0 and sleep_awake_hours <= 24)),
  add column if not exists oxygen_saturation_pct numeric(5, 2)
    check (oxygen_saturation_pct is null or (oxygen_saturation_pct >= 0 and oxygen_saturation_pct <= 100)),
  add column if not exists body_temperature_c numeric(5, 2)
    check (body_temperature_c is null or (body_temperature_c >= 30 and body_temperature_c <= 45)),
  add column if not exists blood_glucose_mmol_l numeric(6, 2)
    check (blood_glucose_mmol_l is null or (blood_glucose_mmol_l >= 0 and blood_glucose_mmol_l <= 50)),
  add column if not exists reproductive_events_count integer
    check (reproductive_events_count is null or reproductive_events_count >= 0);
