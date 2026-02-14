-- OAuth infrastructure for health integrations

create table if not exists public.health_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (
    provider = any (
      array[
        'fitbit'::text,
        'garmin'::text,
        'oura'::text,
        'withings'::text,
        'polar'::text,
        'whoop'::text
      ]
    )
  ),
  state text not null unique,
  return_to text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_health_oauth_states_state on public.health_oauth_states(state);
create index if not exists idx_health_oauth_states_user_provider on public.health_oauth_states(user_id, provider);

create table if not exists public.health_integration_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (
    provider = any (
      array[
        'fitbit'::text,
        'garmin'::text,
        'oura'::text,
        'withings'::text,
        'polar'::text,
        'whoop'::text
      ]
    )
  ),
  access_token text not null,
  refresh_token text,
  token_type text,
  scope text[] not null default '{}'::text[],
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(user_id, provider)
);

create index if not exists idx_health_integration_tokens_user_provider on public.health_integration_tokens(user_id, provider);
create index if not exists idx_health_integration_tokens_expires_at on public.health_integration_tokens(expires_at);

alter table public.health_oauth_states enable row level security;
alter table public.health_integration_tokens enable row level security;

-- No policies for authenticated users by design.
-- Only service_role should access these tables.

grant all on table public.health_oauth_states to service_role;
grant all on table public.health_integration_tokens to service_role;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'handle_health_integration_tokens_updated_at'
  ) then
    create trigger handle_health_integration_tokens_updated_at
      before update on public.health_integration_tokens
      for each row
      execute function public.handle_updated_at();
  end if;
end
$$;
