-- Health module: integrations + metrics

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.health_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (
    provider = any (
      array[
        'apple_health'::text,
        'health_connect'::text,
        'fitbit'::text,
        'garmin'::text,
        'oura'::text,
        'withings'::text,
        'polar'::text,
        'whoop'::text
      ]
    )
  ),
  status text not null default 'pending' check (
    status = any (
      array['pending'::text, 'connected'::text, 'error'::text, 'revoked'::text]
    )
  ),
  access_scope text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id, provider)
);

create table if not exists public.health_metric_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recorded_for date not null default (timezone('utc'::text, now()))::date,
  source text not null default 'manual' check (
    source = any (array['manual'::text, 'integration'::text, 'browser'::text])
  ),
  steps integer check (steps is null or steps >= 0),
  sleep_hours numeric(4, 2) check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  water_ml integer check (water_ml is null or water_ml >= 0),
  weight_kg numeric(5, 2) check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 500)),
  resting_heart_rate integer check (resting_heart_rate is null or (resting_heart_rate >= 25 and resting_heart_rate <= 260)),
  systolic_bp integer check (systolic_bp is null or (systolic_bp >= 50 and systolic_bp <= 260)),
  diastolic_bp integer check (diastolic_bp is null or (diastolic_bp >= 30 and diastolic_bp <= 180)),
  calories integer check (calories is null or calories >= 0),
  mood_score integer check (mood_score is null or (mood_score >= 1 and mood_score <= 10)),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id, recorded_for, source)
);

create index if not exists idx_health_integrations_user_id on public.health_integrations(user_id);
create index if not exists idx_health_integrations_status on public.health_integrations(status);
create index if not exists idx_health_metric_entries_user_date on public.health_metric_entries(user_id, recorded_for desc);
create index if not exists idx_health_metric_entries_source on public.health_metric_entries(source);

alter table public.health_integrations enable row level security;
alter table public.health_metric_entries enable row level security;

drop policy if exists "Users can view own health integrations" on public.health_integrations;
drop policy if exists "Users can insert own health integrations" on public.health_integrations;
drop policy if exists "Users can update own health integrations" on public.health_integrations;
drop policy if exists "Users can delete own health integrations" on public.health_integrations;

create policy "Users can view own health integrations"
  on public.health_integrations for select
  using (auth.uid() = user_id);

create policy "Users can insert own health integrations"
  on public.health_integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own health integrations"
  on public.health_integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete own health integrations"
  on public.health_integrations for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own health metrics" on public.health_metric_entries;
drop policy if exists "Users can insert own health metrics" on public.health_metric_entries;
drop policy if exists "Users can update own health metrics" on public.health_metric_entries;
drop policy if exists "Users can delete own health metrics" on public.health_metric_entries;

create policy "Users can view own health metrics"
  on public.health_metric_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own health metrics"
  on public.health_metric_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own health metrics"
  on public.health_metric_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own health metrics"
  on public.health_metric_entries for delete
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'handle_health_integrations_updated_at'
  ) then
    create trigger handle_health_integrations_updated_at
      before update on public.health_integrations
      for each row
      execute function public.handle_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'handle_health_metric_entries_updated_at'
  ) then
    create trigger handle_health_metric_entries_updated_at
      before update on public.health_metric_entries
      for each row
      execute function public.handle_updated_at();
  end if;
end
$$;

grant all on table public.health_integrations to authenticated;
grant all on table public.health_integrations to service_role;
grant all on table public.health_metric_entries to authenticated;
grant all on table public.health_metric_entries to service_role;
