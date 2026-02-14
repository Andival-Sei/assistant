-- Базовая схема финансовых таблиц для Assistant
-- Использует CREATE TABLE IF NOT EXISTS, чтобы не ломать уже существующую БД

create table if not exists public.wallets (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  currency text not null default 'USD',
  balance numeric not null default 0.00,
  color text,
  icon text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_wallets_user_id on public.wallets(user_id);

create table if not exists public.categories (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid default auth.uid() references auth.users(id),
  name text not null,
  type text not null check (type = any (array['income'::text, 'expense'::text])),
  icon text,
  color text,
  is_default boolean default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  parent_id uuid references public.categories(id)
);

create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_categories_parent_id on public.categories(parent_id);
create index if not exists idx_categories_type on public.categories(type);

create table if not exists public.transactions (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id),
  wallet_id uuid not null references public.wallets(id),
  category_id uuid references public.categories(id),
  amount numeric not null,
  type text not null check (type = any (array['income'::text, 'expense'::text, 'transfer'::text])),
  description text,
  date timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb,
  to_wallet_id uuid references public.wallets(id),
  receipt_url text
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_wallet_id on public.transactions(wallet_id);
create index if not exists idx_transactions_category_id on public.transactions(category_id);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_type on public.transactions(type);

