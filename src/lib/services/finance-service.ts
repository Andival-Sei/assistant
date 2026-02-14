import { supabaseClient } from "@/lib/db/supabase-client";
import {
  DEFAULT_SEED_CATEGORIES,
  type SeedCategory,
} from "@/lib/db/seed-categories-data";
import type {
  Wallet,
  Category,
  Transaction,
  TransactionWithItems,
  TransactionItem,
  TransactionItemFormData,
} from "@/types/finance";

type ReceiptScanResult = {
  merchant: string | null;
  date: string | null;
  total_amount: number | null;
  currency: string | null;
  category_suggestion: string | null;
  items: Array<{
    name: string;
    amount: number;
    category_suggestion: string | null;
  }>;
};

type RawTransactionRow = Transaction & {
  items?: Array<{
    id: string;
    transaction_id: string;
    category_id: string | null;
    amount: number;
    description: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    category?: Category | Category[] | null;
  }>;
};

function transformTransactionRow(row: RawTransactionRow): TransactionWithItems {
  const items = (row.items || []).map((item) => {
    const category = Array.isArray(item.category)
      ? item.category[0] || null
      : item.category || null;
    return {
      ...item,
      category,
    } as TransactionItem;
  });
  items.sort((a, b) => a.sort_order - b.sort_order);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- exclude items from tx
  const { items: _, ...tx } = row;
  return { ...tx, items };
}

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
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user?.id) {
      throw new Error("Пользователь не авторизован");
    }

    const row = {
      ...wallet,
      user_id: wallet.user_id ?? user.id,
    };

    const { data, error } = await supabaseClient
      .from("wallets")
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet> {
    const { data, error } = await supabaseClient
      .from("wallets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteWallet(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from("wallets")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async hasWalletTransactions(walletId: string): Promise<boolean> {
    const { count, error } = await supabaseClient
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("wallet_id", walletId);

    if (error) throw error;
    return (count ?? 0) > 0;
  },

  // Categories — только категории текущего пользователя (игнорируем системные user_id = null)
  async getCategories(): Promise<Category[]> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) return [];

    const { data, error } = await supabaseClient
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) throw error;
    return data || [];
  },

  async createCategory(
    category: Omit<Category, "id" | "user_id" | "created_at" | "is_default">
  ): Promise<Category> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const { data, error } = await supabaseClient
      .from("categories")
      .insert({
        ...category,
        user_id: user.id,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(
    id: string,
    updates: Partial<
      Omit<Category, "id" | "user_id" | "created_at" | "is_default">
    >
  ): Promise<Category> {
    const { data, error } = await supabaseClient
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabaseClient
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async seedDefaultCategories(): Promise<void> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const { count } = await supabaseClient
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count > 0) return;

    // Уровень по родителю: корень = 0, иначе уровень родителя + 1
    const levelByName = new Map<string, number>();
    for (const c of DEFAULT_SEED_CATEGORIES) {
      const level = c.parent ? (levelByName.get(c.parent) ?? 0) + 1 : 0;
      levelByName.set(c.name, level);
    }

    const byLevel = new Map<number, SeedCategory[]>();
    for (const c of DEFAULT_SEED_CATEGORIES) {
      const level = levelByName.get(c.name) ?? 0;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push(c);
    }

    const idByName = new Map<string, string>();
    const maxLevel = Math.max(...byLevel.keys());

    for (let level = 0; level <= maxLevel; level++) {
      const batch = byLevel.get(level) ?? [];
      const toInsert = batch.map((cat) => ({
        user_id: user.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon ?? null,
        color: cat.color ?? null,
        is_default: true,
        parent_id: cat.parent ? (idByName.get(cat.parent) ?? null) : null,
      }));

      const { data: inserted, error } = await supabaseClient
        .from("categories")
        .insert(toInsert)
        .select("id, name");

      if (error) throw error;
      for (const row of inserted ?? []) {
        idByName.set(row.name, row.id);
      }
    }
  },

  // Transactions
  async getTransactions(params?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionWithItems[]> {
    let query = supabaseClient.from("transactions").select(
      `
        *,
        items:transaction_items(
          id,
          transaction_id,
          category_id,
          amount,
          description,
          sort_order,
          created_at,
          updated_at,
          category:categories(id, name, type, icon, color)
        )
      `
    );

    if (params?.startDate) {
      query = query.gte("date", params.startDate);
    }
    if (params?.endDate) {
      query = query.lte("date", params.endDate);
    }

    const { data, error } = await query
      .order("date", { ascending: false })
      .limit(params?.limit ?? 500);

    if (error) throw error;
    const rows = (data || []) as RawTransactionRow[];

    // Имена кошельков — отдельным запросом
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

    return rows.map(transformTransactionRow).map((r) => ({
      ...r,
      wallets: r.wallets ?? { name: walletsMap.get(r.wallet_id) ?? "Счёт" },
    }));
  },

  async createTransaction(
    transaction: Partial<Transaction>
  ): Promise<Transaction> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const row = {
      ...transaction,
      user_id: transaction.user_id ?? user.id,
    };

    const { data, error } = await supabaseClient
      .from("transactions")
      .insert([row])
      .select()
      .single();

    if (error) throw error;

    const amount = Number(transaction.amount) || 0;
    let sourceChange = 0;
    if (transaction.type === "expense") sourceChange = -amount;
    if (transaction.type === "income") sourceChange = amount;
    if (transaction.type === "transfer") sourceChange = -amount;

    if (sourceChange !== 0 && transaction.wallet_id) {
      await this.updateBalance(transaction.wallet_id, sourceChange);
    }
    if (transaction.type === "transfer" && transaction.to_wallet_id) {
      await this.updateBalance(transaction.to_wallet_id, amount);
    }

    return data;
  },

  /** Создаёт транзакцию с позициями (split transaction). Одна запись + N items. */
  async createTransactionWithItems(data: {
    wallet_id: string;
    type: "expense";
    date: string;
    description?: string;
    receipt_url?: string;
    items: TransactionItemFormData[];
  }): Promise<TransactionWithItems> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    const totalAmount = data.items.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    if (totalAmount <= 0) throw new Error("Сумма позиций должна быть больше 0");

    const txRow = {
      wallet_id: data.wallet_id,
      user_id: user.id,
      type: "expense" as const,
      amount: totalAmount,
      category_id: null,
      date: data.date,
      description: data.description || null,
      receipt_url: data.receipt_url || null,
    };

    const { data: tx, error: txError } = await supabaseClient
      .from("transactions")
      .insert([txRow])
      .select("id")
      .single();

    if (txError) throw txError;

    const itemsToInsert = data.items
      .filter((item) => Number(item.amount) > 0)
      .map((item, index) => ({
        transaction_id: tx.id,
        category_id: item.category_id || null,
        amount: Number(item.amount),
        description: item.description || null,
        sort_order: item.sort_order ?? index,
      }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabaseClient
        .from("transaction_items")
        .insert(itemsToInsert);

      if (itemsError) {
        await supabaseClient.from("transactions").delete().eq("id", tx.id);
        throw itemsError;
      }
    }

    await this.updateBalance(data.wallet_id, -totalAmount);

    const { data: fullRow, error: fetchError } = await supabaseClient
      .from("transactions")
      .select(
        `
        *,
        items:transaction_items(
          id,
          transaction_id,
          category_id,
          amount,
          description,
          sort_order,
          created_at,
          updated_at,
          category:categories(id, name, type, icon, color)
        )
      `
      )
      .eq("id", tx.id)
      .single();

    if (fetchError || !fullRow) {
      return {
        ...txRow,
        id: tx.id,
        created_at: new Date().toISOString(),
        items: itemsToInsert.map((item, i) => ({
          id: `temp-${i}`,
          transaction_id: tx.id,
          category_id: item.category_id,
          amount: item.amount,
          description: item.description,
          sort_order: item.sort_order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      } as unknown as TransactionWithItems;
    }

    return transformTransactionRow(fullRow as RawTransactionRow);
  },

  async processReceipt(file: File): Promise<ReceiptScanResult> {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      console.error("ProcessReceipt: No session found");
      throw new Error("Сессия не найдена. Пожалуйста, войдите снова.");
    }

    // Конвертируем файл в base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    console.log(
      "ProcessReceipt: Invoking function with token length:",
      session.access_token.length
    );

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error(
        "VITE_SUPABASE_ANON_KEY не задан. Невозможно вызвать Edge Function."
      );
    }

    const { data, error } = await supabaseClient.functions.invoke(
      "process-receipt",
      {
        body: {
          file_data: base64,
          file_name: file.name,
          file_type: file.type,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
      }
    );

    if (error) {
      let errorMessage = error.message;
      if (error.context instanceof Response) {
        try {
          const text = await error.context.text();
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
        } catch (e) {
          console.error("Error parsing function error context:", e);
        }
      }
      throw new Error(errorMessage);
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
