# Finance: API и Hooks

> 📋 **Статус: Спецификация**
> Код ещё не реализован. Это план для реализации модуля.

API и React hooks для модуля финансов.

## Hooks

### useAccounts

Управление счетами пользователя.

```typescript
interface UseAccountsReturn {
  // Данные
  accounts: Account[];
  isLoading: boolean;
  error: Error | null;

  // Computed
  totalBalance: number; // В displayCurrency
  cardBalance: number;
  cashBalance: number;

  // Мутации
  createAccount: (data: CreateAccountInput) => Promise<Account>;
  updateAccount: (id: string, data: UpdateAccountInput) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
}

interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
}

interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
}
```

**Пример использования:**

```typescript
function AccountsPage() {
  const { accounts, totalBalance, createAccount, isLoading } = useAccounts();

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1>Баланс: {formatCurrency(totalBalance)}</h1>
      <AccountList accounts={accounts} />
      <CreateAccountForm onSubmit={createAccount} />
    </div>
  );
}
```

### useTransactions

Управление транзакциями с фильтрацией.

```typescript
interface UseTransactionsOptions {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

interface UseTransactionsReturn {
  // Данные
  transactions: Transaction[];
  isLoading: boolean;
  error: Error | null;

  // Пагинация
  hasMore: boolean;
  loadMore: () => void;

  // Мутации
  createTransaction: (data: CreateTransactionInput) => Promise<Transaction>;
  updateTransaction: (
    id: string,
    data: UpdateTransactionInput
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

interface CreateTransactionInput {
  account_id: string;
  to_account_id?: string; // Для переводов
  category_id: string;
  type: TransactionType;
  amount: number;
  description?: string;
  date: string;
}

interface UpdateTransactionInput {
  category_id?: string;
  amount?: number;
  description?: string;
  date?: string;
}
```

**Пример использования:**

```typescript
function TransactionsPage() {
  const [filters, setFilters] = useState<UseTransactionsOptions>({
    dateFrom: startOfMonth(new Date()),
    dateTo: endOfMonth(new Date()),
  });

  const { transactions, isLoading, createTransaction } =
    useTransactions(filters);

  return (
    <div>
      <TransactionFilters value={filters} onChange={setFilters} />
      <TransactionList transactions={transactions} />
      <AddTransactionButton onCreate={createTransaction} />
    </div>
  );
}
```

### useCategories

Управление категориями.

```typescript
interface UseCategoriesOptions {
  type?: CategoryType; // Фильтр по типу
}

interface UseCategoriesReturn {
  // Данные
  categories: Category[];
  isLoading: boolean;
  error: Error | null;

  // Computed
  incomeCategories: Category[];
  expenseCategories: Category[];
  getCategoryTree: (type: CategoryType) => CategoryTree[];

  // Мутации
  createCategory: (data: CreateCategoryInput) => Promise<Category>;
  updateCategory: (id: string, data: UpdateCategoryInput) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
}

interface CategoryTree extends Category {
  children: CategoryTree[];
}

interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  parent_id?: string;
  icon?: string;
}

interface UpdateCategoryInput {
  name?: string;
  parent_id?: string;
  icon?: string;
}
```

**Пример использования:**

```typescript
function CategorySelect({ type, value, onChange }) {
  const { getCategoryTree } = useCategories();
  const tree = getCategoryTree(type);

  return (
    <Select value={value} onChange={onChange}>
      {tree.map((category) => (
        <CategoryOption key={category.id} category={category} />
      ))}
    </Select>
  );
}
```

### useStatistics

Агрегированная статистика.

```typescript
interface UseStatisticsOptions {
  dateFrom: string;
  dateTo: string;
  displayCurrency?: string;
}

interface UseStatisticsReturn {
  // Данные
  isLoading: boolean;
  error: Error | null;

  // Метрики
  totalIncome: number;
  totalExpense: number;
  netResult: number; // income - expense

  // По категориям
  expensesByCategory: CategoryStat[];
  incomesByCategory: CategoryStat[];

  // Сравнение с предыдущим периодом
  incomeChange: number; // Процент
  expenseChange: number; // Процент
}

interface CategoryStat {
  category: Category;
  amount: number;
  percentage: number; // От общей суммы
  transactionCount: number;
}
```

**Пример использования:**

```typescript
function StatisticsPage() {
  const { totalIncome, totalExpense, expensesByCategory, isLoading } =
    useStatistics({
      dateFrom: startOfMonth(new Date()),
      dateTo: endOfMonth(new Date()),
    });

  return (
    <div>
      <StatCards income={totalIncome} expense={totalExpense} />
      <ExpensePieChart data={expensesByCategory} />
    </div>
  );
}
```

## Query Keys

Структура ключей кеша TanStack Query:

```typescript
const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    list: () => [...queryKeys.accounts.all, "list"] as const,
    detail: (id: string) => [...queryKeys.accounts.all, "detail", id] as const,
  },

  transactions: {
    all: ["transactions"] as const,
    list: (filters?: TransactionFilters) =>
      [...queryKeys.transactions.all, "list", filters] as const,
    detail: (id: string) =>
      [...queryKeys.transactions.all, "detail", id] as const,
  },

  categories: {
    all: ["categories"] as const,
    list: (type?: CategoryType) =>
      [...queryKeys.categories.all, "list", type] as const,
  },

  statistics: {
    all: ["statistics"] as const,
    period: (from: string, to: string) =>
      [...queryKeys.statistics.all, "period", from, to] as const,
  },
};
```

## Оптимистичные обновления

Все мутации используют оптимистичные обновления для мгновенного UI:

```typescript
const createTransaction = useMutation({
  mutationFn: (data: CreateTransactionInput) => api.createTransaction(data),

  onMutate: async (newTransaction) => {
    // Отменяем текущие запросы
    await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });

    // Сохраняем предыдущее состояние
    const previousTransactions = queryClient.getQueryData(
      queryKeys.transactions.list()
    );

    // Оптимистично добавляем транзакцию
    queryClient.setQueryData(queryKeys.transactions.list(), (old) => [
      { ...newTransaction, id: "temp-id" },
      ...old,
    ]);

    return { previousTransactions };
  },

  onError: (err, newTransaction, context) => {
    // Откатываем при ошибке
    queryClient.setQueryData(
      queryKeys.transactions.list(),
      context.previousTransactions
    );
  },

  onSettled: () => {
    // Инвалидируем кеш
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all });
  },
});
```

## Валидация (Zod)

Схемы валидации для форм:

```typescript
import { z } from "zod";

// Счёт
export const accountSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(100),
  type: z.enum(["card", "cash", "other"]),
  balance: z.number(),
  currency: z.string().length(3),
});

// Транзакция
export const transactionSchema = z.object({
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive("Сумма должна быть положительной"),
  description: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Категория
export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["income", "expense"]),
  parent_id: z.string().uuid().optional(),
  icon: z.string().max(50).optional(),
});
```

## Референс

Реализация из Pennora:

- Queries: `reference/pennora/lib/query/queries/`
- Mutations: `reference/pennora/lib/query/mutations/`
- Keys: `reference/pennora/lib/query/keys.ts`
- Hooks: `reference/pennora/lib/hooks/`
- Validations: `reference/pennora/lib/validations/`
