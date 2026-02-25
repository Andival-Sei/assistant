# Health Contract (Web + Android)

> Статус Android-клиента: нативное приложение сейчас **на паузе**. Этот документ описывает единый health-контракт для backend Web и Android.

## Таблицы

- `health_metric_entries`
- `health_integrations`

## Интеграции

- Google Fit sync: `POST /functions/v1/health-google-fit-sync`
- Fitbit sync: `POST /functions/v1/health-fitbit-sync`

## Idempotent upsert

Ключ: `user_id + recorded_for + source`.

## Health Connect (Android native)

- Проверка доступности SDK.
- Запрос runtime permissions.
- Чтение: steps/sleep stages/hr/weight/spo2/bp/water.
- Нормализация в формат `health_metric_entries`.
- `metadata.provider = "health_connect"`.

## Retry/backoff

- Worker: экспоненциальный backoff.
- При ответе 429 использовать `retry_after_seconds`.
- Повторный запуск не должен порождать дублей.

## Статусы интеграции

- `not_connected`
- `connected`
- `error`
- `revoked`

Псевдо-позитивные статусы запрещены: подключение считается успешным только после фактической валидации доступа/синка.
