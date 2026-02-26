-- Auth hardening + RLS/performance cleanup
-- 1) Normalize/optimize RLS policies to avoid per-row auth.uid() re-evaluation
-- 2) Remove duplicate permissive policies
-- 3) Add missing FK indexes
-- 4) Harden SQL functions with immutable search_path

-- Missing FK indexes from advisor
create index if not exists idx_transactions_to_wallet_id
  on public.transactions(to_wallet_id)
  where to_wallet_id is not null;

create index if not exists idx_task_push_deliveries_subscription_id
  on public.task_push_deliveries(subscription_id);

create index if not exists idx_categories_user_id
  on public.categories(user_id);

create index if not exists idx_categories_parent_id
  on public.categories(parent_id);

-- Harden generic trigger function used across modules
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Harden transaction_items trigger function
create or replace function public.update_transaction_items_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Harden finance RPC
create or replace function public.update_wallet_balance(
  w_id uuid,
  amount_change numeric
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.wallets
  set balance = balance + amount_change,
      updated_at = timezone('utc'::text, now())
  where id = w_id
    and user_id = (select auth.uid());
$$;

revoke all on function public.update_wallet_balance(uuid, numeric) from public;
grant execute on function public.update_wallet_balance(uuid, numeric) to authenticated;
grant execute on function public.update_wallet_balance(uuid, numeric) to service_role;

-- wallets: drop all known duplicates/legacy policies
drop policy if exists "Users can view their own wallets" on public.wallets;
drop policy if exists "Users can insert their own wallets" on public.wallets;
drop policy if exists "Users can update their own wallets" on public.wallets;
drop policy if exists "Users can manage their own wallets" on public.wallets;

create policy "Users can view their own wallets"
  on public.wallets for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own wallets"
  on public.wallets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own wallets"
  on public.wallets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own wallets"
  on public.wallets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- transactions: drop all known duplicates/legacy policies
drop policy if exists "Users can view their own transactions" on public.transactions;
drop policy if exists "Users can insert their own transactions" on public.transactions;
drop policy if exists "Users can update their own transactions" on public.transactions;
drop policy if exists "Users can delete their own transactions" on public.transactions;
drop policy if exists "Users can manage their own transactions" on public.transactions;

create policy "Users can view their own transactions"
  on public.transactions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own transactions"
  on public.transactions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own transactions"
  on public.transactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- categories: drop duplicate/legacy policies
drop policy if exists "Users can view categories" on public.categories;
drop policy if exists "Users can view own and system categories" on public.categories;
drop policy if exists "Users can insert their own categories" on public.categories;
drop policy if exists "Users can insert own categories" on public.categories;
drop policy if exists "Users can update their own categories" on public.categories;
drop policy if exists "Users can update own categories" on public.categories;
drop policy if exists "Users can delete their own categories" on public.categories;
drop policy if exists "Users can delete own categories" on public.categories;

create policy "Users can view own and system categories"
  on public.categories for select
  to authenticated
  using (user_id is null or (select auth.uid()) = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own categories"
  on public.categories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- transaction_items
drop policy if exists "Users can view own transaction items" on public.transaction_items;
drop policy if exists "Users can insert own transaction items" on public.transaction_items;
drop policy if exists "Users can update own transaction items" on public.transaction_items;
drop policy if exists "Users can delete own transaction items" on public.transaction_items;

create policy "Users can view own transaction items"
  on public.transaction_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_items.transaction_id
        and t.user_id = (select auth.uid())
    )
  );

create policy "Users can insert own transaction items"
  on public.transaction_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_items.transaction_id
        and t.user_id = (select auth.uid())
    )
  );

create policy "Users can update own transaction items"
  on public.transaction_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_items.transaction_id
        and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_items.transaction_id
        and t.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own transaction items"
  on public.transaction_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_items.transaction_id
        and t.user_id = (select auth.uid())
    )
  );

-- user_settings
drop policy if exists "Users can view their own settings" on public.user_settings;
drop policy if exists "Users can update their own settings" on public.user_settings;
drop policy if exists "Users can insert their own settings" on public.user_settings;
drop policy if exists "Users can delete their own settings" on public.user_settings;

create policy "Users can view their own settings"
  on public.user_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own settings"
  on public.user_settings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- user_profiles
drop policy if exists "Users can view their own profile" on public.user_profiles;
drop policy if exists "Users can insert their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;
drop policy if exists "Users can delete their own profile" on public.user_profiles;

create policy "Users can view their own profile"
  on public.user_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own profile"
  on public.user_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own profile"
  on public.user_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- health_integrations
drop policy if exists "Users can view own health integrations" on public.health_integrations;
drop policy if exists "Users can insert own health integrations" on public.health_integrations;
drop policy if exists "Users can update own health integrations" on public.health_integrations;
drop policy if exists "Users can delete own health integrations" on public.health_integrations;

create policy "Users can view own health integrations"
  on public.health_integrations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own health integrations"
  on public.health_integrations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own health integrations"
  on public.health_integrations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own health integrations"
  on public.health_integrations for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- health_metric_entries
drop policy if exists "Users can view own health metrics" on public.health_metric_entries;
drop policy if exists "Users can insert own health metrics" on public.health_metric_entries;
drop policy if exists "Users can update own health metrics" on public.health_metric_entries;
drop policy if exists "Users can delete own health metrics" on public.health_metric_entries;

create policy "Users can view own health metrics"
  on public.health_metric_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own health metrics"
  on public.health_metric_entries for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own health metrics"
  on public.health_metric_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own health metrics"
  on public.health_metric_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- tasks
drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Users can view own tasks"
  on public.tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- task_push_subscriptions
drop policy if exists "Users can view own task subscriptions" on public.task_push_subscriptions;
drop policy if exists "Users can insert own task subscriptions" on public.task_push_subscriptions;
drop policy if exists "Users can update own task subscriptions" on public.task_push_subscriptions;
drop policy if exists "Users can delete own task subscriptions" on public.task_push_subscriptions;

create policy "Users can view own task subscriptions"
  on public.task_push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own task subscriptions"
  on public.task_push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own task subscriptions"
  on public.task_push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own task subscriptions"
  on public.task_push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- task_push_deliveries
drop policy if exists "Users can view own task push deliveries" on public.task_push_deliveries;

create policy "Users can view own task push deliveries"
  on public.task_push_deliveries for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Explicit service_role-only policies to satisfy "RLS enabled no policy" lint
drop policy if exists "Service role can manage oauth states" on public.health_oauth_states;
drop policy if exists "Service role can manage integration tokens" on public.health_integration_tokens;
drop policy if exists "Service role can manage system settings" on public.system_settings;

create policy "Service role can manage oauth states"
  on public.health_oauth_states for all
  to service_role
  using (true)
  with check (true);

create policy "Service role can manage integration tokens"
  on public.health_integration_tokens for all
  to service_role
  using (true)
  with check (true);

create policy "Service role can manage system settings"
  on public.system_settings for all
  to service_role
  using (true)
  with check (true);
