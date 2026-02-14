-- Таблица настроек пользователя
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  gemini_api_key text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id)
);

-- Включаем RLS
alter table public.user_settings enable row level security;

-- Политики доступа
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- Триггер для обновления updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.handle_updated_at();

-- Даем права ролям
grant all on table public.user_settings to authenticated;
grant all on table public.user_settings to service_role;
