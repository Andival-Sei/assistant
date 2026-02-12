import { supabaseClient } from "@/lib/db/supabase-client";
import type {
  Wallet,
  Category,
  Transaction,
  TransactionType,
} from "@/types/finance";

export const financeService = {
  // Wallets
  async getWallets(): Promise<Wallet[]> {
    const { data, error } = await supabaseClient
      .from("wallets")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  },

  async createWallet(wallet: Partial<Wallet>): Promise<Wallet> {
    const { data, error } = await supabaseClient
      .from("wallets")
      .insert([wallet])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabaseClient
      .from("categories")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  },

  // Transactions
  async getTransactions(limit = 50): Promise<Transaction[]> {
    // Без embeds — при RLS на categories/wallets PostgREST может возвращать пустой результат
    // из‑за INNER JOIN или блокировки вложенных таблиц. Берём только транзакции.
    const { data, error } = await supabaseClient
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    const rows = (data || []) as (Transaction & { categories?: { name: string }; wallets?: { name: string } })[];

    // Имена кошельков — отдельным запросом, т.к. wallets уже прошли RLS при getWallets
    const walletIds = [...new Set(rows.map((r) => r.wallet_id))];
    const walletsMap = new Map<string, string>();
    if (walletIds.length > 0) {
      const { data: wallets } = await supabaseClient
        .from("wallets")
        .select("id, name")
        .in("id", walletIds);
      for (const w of wallets || []) {
        walletsMap.set(w.id, w.name);
      }
    }

    return rows.map((r) => ({
      ...r,
      wallets: r.wallets ?? { name: walletsMap.get(r.wallet_id) ?? "Счёт" },
    }));
  },

  async createTransaction(
    transaction: Partial<Transaction>
  ): Promise<Transaction> {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const row = {
      ...transaction,
      user_id: transaction.user_id ?? user.id,
    };

    // 1. Insert transaction
    const { data, error } = await supabaseClient
      .from("transactions")
      .insert([row])
      .select()
      .single();

    if (error) throw error;

    // 2. Update wallet balances
    // If transfer: deduct from wallet_id, add to to_wallet_id
    // If income: add to wallet_id
    // If expense: deduct from wallet_id

    const amount = Number(transaction.amount) || 0;

    // Primary wallet update (Source)
    let sourceChange = 0;
    if (transaction.type === "expense") sourceChange = -amount;
    if (transaction.type === "income") sourceChange = amount;
    if (transaction.type === "transfer") sourceChange = -amount;

    if (sourceChange !== 0 && transaction.wallet_id) {
      await this.updateBalance(transaction.wallet_id, sourceChange);
    }

    // Secondary wallet update (Destination for transfer)
    if (transaction.type === "transfer" && transaction.to_wallet_id) {
      await this.updateBalance(transaction.to_wallet_id, amount);
    }

    return data;
  },

  async updateBalance(walletId: string, change: number) {
    const { error } = await supabaseClient.rpc("update_wallet_balance", {
      w_id: walletId,
      amount_change: change,
    });

    if (error) {
      console.warn(
        "RPC update_wallet_balance failed/missing, fallback manual update",
        error
      );
      // Fallback logic
      const { data: w } = await supabaseClient
        .from("wallets")
        .select("balance")
        .eq("id", walletId)
        .single();
      if (w) {
        await supabaseClient
          .from("wallets")
          .update({ balance: Number(w.balance) + change })
          .eq("id", walletId);
      }
    }
  },

  // RPC setup should be done in Supabase
};
