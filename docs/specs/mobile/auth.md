# Auth Contract (Web + Android)

> Статус Android-клиента: нативное приложение сейчас **на паузе**. Этот документ описывает общий auth-контракт backend для Web и будущего Android-клиента.

## Endpoint

- Supabase Auth REST:
  - `POST /auth/v1/token?grant_type=password`
  - `POST /auth/v1/signup`

## Request

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

## Response (ключевые поля)

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## Mobile policy

- Access token хранится в DataStore.
- На logout токен удаляется локально.
- Все запросы к Supabase REST/Functions идут с `Authorization: Bearer <token>`.
