export type TransactionType = "income" | "expense" | "transfer";

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  balance: number;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  is_default: boolean;
  parent_id?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  to_wallet_id?: string; // For transfers
  category_id?: string;
  amount: number;
  type: TransactionType;
  description?: string;
  date: string;
  receipt_url?: string;
  created_at: string;
  metadata?: Record<string, any>;
}
