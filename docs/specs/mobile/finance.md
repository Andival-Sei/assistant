# Finance Contract (Web + Android)

> Статус Android-клиента: нативное приложение сейчас **на паузе**. Контракт ниже задаёт единые правила работы backend для Web и Android.

## Таблицы

- `wallets`
- `categories`
- `transactions`
- `transaction_items`

## Основные операции

- Получение кошельков: `GET /rest/v1/wallets?select=*`
- Получение транзакций: `GET /rest/v1/transactions?select=*&order=date.desc&limit=...`
- CRUD выполняется через Supabase REST (с RLS текущего пользователя).

## Split transaction

- Основная транзакция в `transactions`.
- Детализация в `transaction_items`.
- Сумма `transaction_items.amount` должна соответствовать total amount записи.

## Конфликты

- При offline/online рассинхронизации применять upsert с приоритетом `updated_at`.
