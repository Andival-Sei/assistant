-- Enable RLS
alter table public.transactions enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;

-- Transactions policies
create policy "Users can view their own transactions"
on public.transactions for select
to authenticated
using ( auth.uid() = user_id );

create policy "Users can insert their own transactions"
on public.transactions for insert
to authenticated
with check ( auth.uid() = user_id );

create policy "Users can update their own transactions"
on public.transactions for update
to authenticated
using ( auth.uid() = user_id );

create policy "Users can delete their own transactions"
on public.transactions for delete
to authenticated
using ( auth.uid() = user_id );

-- Wallets policies
create policy "Users can view their own wallets"
on public.wallets for select
to authenticated
using ( auth.uid() = user_id );

create policy "Users can insert their own wallets"
on public.wallets for insert
to authenticated
with check ( auth.uid() = user_id );

create policy "Users can update their own wallets"
on public.wallets for update
to authenticated
using ( auth.uid() = user_id );

-- Categories policies (view all, manage own if needed, but usually shared or per-user)
-- Assuming categories are per-user for now based on previous context, or public?
-- Let's assume per-user for safety, or public read if system categories exist.
-- To be safe: Users can view categories where user_id is null (system) OR their own.
create policy "Users can view categories"
on public.categories for select
to authenticated
using ( user_id is null or auth.uid() = user_id );

create policy "Users can insert their own categories"
on public.categories for insert
to authenticated
with check ( auth.uid() = user_id );
