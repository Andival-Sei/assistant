alter table public.transactions drop constraint if exists transactions_to_wallet_id_fkey;
alter table public.transactions
  add constraint transactions_to_wallet_id_fkey
  foreign key (to_wallet_id) references public.wallets(id)
  on delete set null;

alter table public.categories drop constraint if exists categories_parent_id_fkey;
alter table public.categories
  add constraint categories_parent_id_fkey
  foreign key (parent_id) references public.categories(id)
  on delete set null;
