alter table public.tasks
  add column if not exists timezone text,
  add column if not exists recurrence_rule text,
  add column if not exists recurrence_text text,
  add column if not exists source_text text,
  add column if not exists parse_confidence numeric(5, 2),
  add column if not exists parse_model text,
  add column if not exists parse_assumptions jsonb not null default '[]'::jsonb;

create index if not exists idx_tasks_user_due_active
  on public.tasks(user_id, due_at, is_completed);

create index if not exists idx_tasks_recurrence_active
  on public.tasks(user_id, recurrence_rule)
  where recurrence_rule is not null and is_completed = false;
