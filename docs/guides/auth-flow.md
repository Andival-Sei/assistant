# Auth flow в проекте «Ассистент»

Этот гайд описывает, как устроена аутентификация в приложении, и что нужно
знать разработчику при работе с Auth.

## Переменные окружения

В файле `.env.local` должны быть заданы:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

> Эти значения берутся из Supabase Dashboard: Project URL и Publishable API Key.

## Supabase клиент

- Файл: `src/lib/db/supabase-client.ts`
- Экспорт: `supabaseClient`
- Клиент создаётся один раз через `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`.
- В dev-режиме модуль выбрасывает ошибку, если переменные окружения не заданы.

## Auth store (Zustand)

- Файл: `src/lib/stores/auth-store.ts`
- Экспорт: `useAuthStore`
- Состояние:
  - `status: "idle" | "loading" | "authenticated" | "unauthenticated"`
  - `user: User | null`
  - `session: Session | null`
- Экшены:
  - `setLoading()`
  - `setUnauthenticated()`
  - `setSession(session)`
  - `clearSession()`

Store не общается с Supabase напрямую — только хранит состояние.

## AuthProvider

- Файл: `src/providers/auth-provider.tsx`
- Оборачивает всё приложение в `main.tsx`.
- При монтировании:
  - вызывает `supabaseClient.auth.getSession()` и обновляет `auth-store`;
  - подписывается на `supabaseClient.auth.onAuthStateChange` и следит за
    изменениями сессии;
  - пока инициализация не завершена, рендерит простой экран-загрузчик.

## ProtectedRoute

- Файл: `src/components/auth/protected-route.tsx`
- Используется в `App.tsx` для защиты маршрута `/dashboard`.
- Логика:
  - если `status` = `idle | loading` — показывается экран «Проверяем авторизацию…»;
  - если `status` = `unauthenticated` или `user` отсутствует — редирект на
    `/login` с сохранением `from` в `location.state`;
  - если `authenticated` — рендерит дочерние компоненты.

## Страницы Login и Register

- `src/pages/auth/login.tsx`
  - форма email/password;
  - `signInWithPassword` → при успехе редирект на `state.from` или `/dashboard`;
  - пользовательские сообщения об ошибках (невалидные креды, общая ошибка).
- `src/pages/auth/register.tsx`
  - форма email/password/confirm;
  - клиентская проверка совпадения паролей;
  - `signUp` → при отключённом email confirmation Supabase сразу вернёт `session`;
  - при успехе: редирект на `/dashboard` (если пришла сессия) или `/login`.

## Logout

- Компонент: `src/components/auth/logout-button.tsx`
- При нажатии:
  - вызывает `supabaseClient.auth.signOut()`;
  - при ошибке пишет в консоль (dev);
  - после завершения редиректит пользователя на `/login`.

## Как добавить новый защищённый маршрут

1. Создать страницу в `src/pages/...`, например `src/pages/dashboard/index.tsx`.
2. Импортировать её в `App.tsx`.
3. Обернуть маршрут в `ProtectedRoute`, например:

```tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

После этого страница будет доступна только авторизованным пользователям.
