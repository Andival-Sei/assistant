create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz,
  reminder_enabled boolean not null default false,
  reminder_sent_at timestamptz,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_due_at on public.tasks(due_at);
create index if not exists idx_tasks_active_due on public.tasks(user_id, is_completed, reminder_enabled, due_at);

create table if not exists public.task_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_task_push_subscriptions_user_id on public.task_push_subscriptions(user_id);

create table if not exists public.task_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  subscription_id uuid references public.task_push_subscriptions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  error_text text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_task_push_deliveries_task_id on public.task_push_deliveries(task_id);
create index if not exists idx_task_push_deliveries_user_id on public.task_push_deliveries(user_id);

alter table public.tasks enable row level security;
alter table public.task_push_subscriptions enable row level security;
alter table public.task_push_deliveries enable row level security;

drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own task subscriptions" on public.task_push_subscriptions;
drop policy if exists "Users can insert own task subscriptions" on public.task_push_subscriptions;
drop policy if exists "Users can update own task subscriptions" on public.task_push_subscriptions;
drop policy if exists "Users can delete own task subscriptions" on public.task_push_subscriptions;

create policy "Users can view own task subscriptions"
  on public.task_push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own task subscriptions"
  on public.task_push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own task subscriptions"
  on public.task_push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own task subscriptions"
  on public.task_push_subscriptions for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own task push deliveries" on public.task_push_deliveries;
create policy "Users can view own task push deliveries"
  on public.task_push_deliveries for select
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'handle_tasks_updated_at'
  ) then
    create trigger handle_tasks_updated_at
      before update on public.tasks
      for each row
      execute function public.handle_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'handle_task_push_subscriptions_updated_at'
  ) then
    create trigger handle_task_push_subscriptions_updated_at
      before update on public.task_push_subscriptions
      for each row
      execute function public.handle_updated_at();
  end if;
end
$$;

grant all on table public.tasks to authenticated;
grant all on table public.tasks to service_role;
grant all on table public.task_push_subscriptions to authenticated;
grant all on table public.task_push_subscriptions to service_role;
grant all on table public.task_push_deliveries to authenticated;
grant all on table public.task_push_deliveries to service_role;
