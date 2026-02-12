-- Миграция: Создание таблицы transaction_items для многопозиционных транзакций
-- Позволяет разделять расходы на несколько позиций с разными категориями

CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE transaction_items IS 'Позиции многопозиционных транзакций (split transactions)';
COMMENT ON COLUMN transaction_items.transaction_id IS 'Связь с родительской транзакцией';
COMMENT ON COLUMN transaction_items.category_id IS 'Категория позиции';
COMMENT ON COLUMN transaction_items.amount IS 'Сумма позиции (должна быть > 0)';
COMMENT ON COLUMN transaction_items.description IS 'Описание позиции (название товара из чека)';
COMMENT ON COLUMN transaction_items.sort_order IS 'Порядок сортировки позиций';

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id
  ON transaction_items(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_items_category_id
  ON transaction_items(category_id)
  WHERE category_id IS NOT NULL;

ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transaction items"
  ON transaction_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transaction items"
  ON transaction_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transaction items"
  ON transaction_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transaction items"
  ON transaction_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_items.transaction_id
        AND t.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_transaction_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_items_updated_at
  BEFORE UPDATE ON transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_items_updated_at();
