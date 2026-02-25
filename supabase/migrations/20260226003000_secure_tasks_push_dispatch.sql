create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.system_settings enable row level security;

insert into public.system_settings (key, value)
values ('tasks_push_cron_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create or replace function public.trigger_tasks_push_dispatch()
returns void
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  cron_secret text;
begin
  select s.value
    into cron_secret
  from public.system_settings s
  where s.key = 'tasks_push_cron_secret'
  limit 1;

  if cron_secret is null then
    raise exception 'tasks_push_cron_secret is not configured';
  end if;

  perform net.http_post(
    url := 'https://dakfrzuuhembzhmhrrlx.supabase.co/functions/v1/tasks-push-dispatch',
    headers := jsonb_build_object(
      'Content-Type',
      'application/json',
      'x-cron-secret',
      cron_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

grant execute on function public.trigger_tasks_push_dispatch() to postgres;
