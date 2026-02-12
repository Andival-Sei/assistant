import { supabaseClient } from "@/lib/db/supabase-client";
import type {
  Wallet,
  Category,
  Transaction,
  TransactionWithItems,
  TransactionItem,
  TransactionItemFormData,
} from "@/types/finance";

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

  async seedDefaultCategories(): Promise<void> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user?.id) throw new Error("Пользователь не авторизован");

    // Проверяем, есть ли уже категории
    const { count } = await supabaseClient
      .from("categories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count > 0) return;

    // Массив категорий (упрощенная версия из референса для начала)
    const defaultCategories: Array<Partial<Category>> = [
      // Доходы
      { name: "Зарплата", type: "income", icon: "briefcase", color: "#10b981" },
      {
        name: "Подарки (Доход)",
        type: "income",
        icon: "gift",
        color: "#10b981",
      },
      {
        name: "Инвестиции",
        type: "income",
        icon: "trending-up",
        color: "#10b981",
      },
      // Расходы
      { name: "Еда", type: "expense", icon: "utensils", color: "#ef4444" },
      { name: "Транспорт", type: "expense", icon: "car", color: "#3b82f6" },
      { name: "Жильё", type: "expense", icon: "home", color: "#a855f7" },
      { name: "Здоровье", type: "expense", icon: "heart", color: "#ef4444" },
      {
        name: "Развлечения",
        type: "expense",
        icon: "clapperboard",
        color: "#ec4899",
      },
      {
        name: "Покупки",
        type: "expense",
        icon: "shopping-bag",
        color: "#6366f1",
      },
      { name: "Связь", type: "expense", icon: "smartphone", color: "#3b82f6" },
      {
        name: "Прочее",
        type: "expense",
        icon: "more-horizontal",
        color: "#6b7280",
      },
    ];

    const toInsert = defaultCategories.map((cat) => ({
      ...cat,
      user_id: user.id,
      is_default: true,
    }));

    const { error } = await supabaseClient.from("categories").insert(toInsert);
    if (error) throw error;

    // После создания основных, можно добавить подкатегории, но для MVP начнем с плоского списка
  },

  // Transactions
  async getTransactions(limit = 50): Promise<TransactionWithItems[]> {
    const { data, error } = await supabaseClient
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
      .order("date", { ascending: false })
      .limit(limit);

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
