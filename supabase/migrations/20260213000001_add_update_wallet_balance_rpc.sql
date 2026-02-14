-- RPC: атомарное обновление баланса кошелька
-- Используется financeService.updateBalance

create or replace function public.update_wallet_balance(
  w_id uuid,
  amount_change numeric
)
returns void
language sql
security definer
as $$
  update public.wallets
  set balance = balance + amount_change,
      updated_at = timezone('utc'::text, now())
  where id = w_id
    and user_id = auth.uid();
$$;

