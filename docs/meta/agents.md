# AGENTS.md — Контекст для AI-ассистентов

Детальная информация о проекте для AI-агентов (Cursor, Copilot, Claude и др.).

Для краткого контекста см. [CLAUDE.md](../../CLAUDE.md) в корне проекта.

## О проекте

**Ассистент** — приложение для управления финансами, здоровьем, списками и семейным режимом.

### Ключевые особенности

- SPA на Vite + React (не Next.js)
- Tailwind CSS 4 для стилей
- Модульная архитектура

## Текущее состояние

**Стадия:** Ранняя разработка (лендинг готов)

### Реализовано

- Лендинг с 5 секциями (Hero, Features, HowItWorks, Stats, Footer)
- Темы (светлая/тёмная/системная)
- Базовые UI компоненты (Button)
- Анимации (FadeIn, ScrollFadeIn)
- Роутинг с заглушками для /login, /register, /dashboard и т.д.

### Не реализовано

- Supabase (Auth, DB)
- TanStack Query
- Zustand
- Модули (Finance, Health, Assistant, Family)

## Технологический стек

### Установлено

| Технология               | Версия  | Назначение               |
| ------------------------ | ------- | ------------------------ |
| Vite                     | 6.x     | Сборщик и dev-сервер     |
| React                    | 19.x    | UI библиотека            |
| TypeScript               | 5.7.x   | Типизация                |
| React Router             | 7.x     | Клиентская маршрутизация |
| Tailwind CSS             | 4.x     | CSS фреймворк            |
| Framer Motion            | 12.x    | Анимации                 |
| Lucide React             | 0.562.x | Иконки                   |
| class-variance-authority | 0.7.x   | Варианты компонентов     |
| clsx + tailwind-merge    | latest  | Утилиты для классов      |
| ESLint                   | 9.x     | Линтинг                  |
| Prettier                 | 3.x     | Форматирование           |

### Планируется

| Технология      | Назначение                       |
| --------------- | -------------------------------- |
| Supabase        | БД, Auth, Realtime               |
| TanStack Query  | Серверное состояние, кеширование |
| Zustand         | Клиентское состояние             |
| Zod             | Валидация схем                   |
| React Hook Form | Работа с формами                 |

## Пакетный менеджер

Используем **pnpm**. Все команды выполнять через `pnpm`.

## Структура проекта (текущая)

```
assistant/
├── src/
│   ├── components/           # React компоненты
│   │   ├── ui/               # Button
│   │   ├── landing/          # Hero, Features, HowItWorks, Stats, Footer
│   │   ├── motion/           # FadeIn, ScrollFadeIn
│   │   └── theme-toggle.tsx
│   │
│   ├── pages/                # Страницы
│   │   ├── landing/          # Главная страница
│   │   └── placeholder.tsx   # Заглушка для роутов
│   │
│   ├── lib/
│   │   └── utils.ts          # cn() и хелперы
│   │
│   ├── providers/
│   │   └── theme-provider.tsx
│   │
│   ├── App.tsx               # Роутинг
│   ├── main.tsx              # Точка входа
│   └── index.css             # Стили и темы
│
├── docs/                     # Документация
├── public/                   # Статика
└── reference/pennora/        # Референс
```

> Целевая структура описана в [target-architecture.md](../concepts/target-architecture.md)

## Модули приложения

| Модуль        | Статус     | Описание                                                |
| ------------- | ---------- | ------------------------------------------------------- |
| **Finance**   | Spec Ready | Спецификация в [docs/specs/finance/](../specs/finance/) |
| **Health**    | Spec Only  | Только README                                           |
| **Assistant** | Spec Only  | Только README                                           |
| **Family**    | Spec Only  | Только README                                           |

> Код модулей ещё не реализован. См. [roadmap](./roadmap.md).

Спецификации модулей: [docs/specs/](../specs/)

## Правила разработки

### Код

- TypeScript для всего кода
- Комментарии на русском языке
- Clean Code: осмысленные имена, маленькие функции, DRY, KISS
- Предпочитать interfaces над types
- Избегать enums — использовать maps/objects

### Стиль кода

- ESLint + Prettier для форматирования
- НЕ править стиль вручную — использовать `pnpm lint:fix` и `pnpm format`

### Импорты

- Алиас `@/*` для импортов из `src/`
- Пример: `import { Button } from "@/components/ui/button"`

### Компоненты

- Функциональные компоненты с хуками
- Named exports (не default)
- Директории: lowercase с дефисами (`auth-wizard/`)
- Файлы компонентов: PascalCase (`TransactionForm.tsx`)

### Хуки

- Файлы: camelCase с префиксом `use` (`useTransactions.ts`)
- Возвращать объект с понятными именами свойств

## Кеширование данных (TanStack Query)

> ⚠️ **Планируется.** TanStack Query ещё не установлен. Это описание целевой архитектуры.

### Основные принципы

- Все данные из Supabase кешируются через TanStack Query
- Оптимистичные обновления для мгновенного UI
- Инвалидация связанных кешей при мутациях

### staleTime по типам данных

| Данные      | staleTime | Причина               |
| ----------- | --------- | --------------------- |
| Транзакции  | 2 мин     | Часто меняются        |
| Счета       | 10 мин    | Редко меняются        |
| Категории   | 10 мин    | Редко меняются        |
| Курсы валют | 1 час     | Обновляются раз в час |

### Query Keys

```typescript
const queryKeys = {
  accounts: {
    all: ["accounts"],
    list: () => [...queryKeys.accounts.all, "list"],
    detail: (id: string) => [...queryKeys.accounts.all, id],
  },
  transactions: {
    all: ["transactions"],
    list: (filters) => [...queryKeys.transactions.all, "list", filters],
  },
  // ...
};
```

## Темы и стили

### Темы

- Светлая, тёмная, системная
- Цветовая схема: изумрудно-зелёная (`#10b981` / `#00dc82`)
- CSS переменные в `index.css`
- Класс `.dark` на `<html>`

### Tailwind CSS 4

- Конфигурация через CSS (`@theme`)
- Нет `tailwind.config.js`
- PostCSS plugin: `@tailwindcss/postcss`

## Референс (Pennora)

Папка `reference/pennora/` содержит предыдущую реализацию. Используется для:

### Что переиспользовать

| Что             | Путь                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| Типы данных     | `reference/pennora/lib/types/`                                               |
| Валидации       | `reference/pennora/lib/validations/`                                         |
| Query/Mutations | `reference/pennora/lib/query/`                                               |
| UI компоненты   | `reference/pennora/components/ui/`, `reference/pennora/components/features/` |
| Схема БД        | `reference/pennora/supabase/migrations/`                                     |
| Стили/темы      | `reference/pennora/app/globals.css`                                          |

### Что НЕ переиспользовать

- Next.js специфичный код (Server Components, `use server`)
- `next-intl` (i18n)
- Middleware
- SSR логика

## Команды

```bash
pnpm install      # Установка зависимостей
pnpm dev          # Dev-сервер (http://localhost:5173)
pnpm build        # Production сборка
pnpm preview      # Превью сборки
pnpm lint         # ESLint проверка
pnpm lint:fix     # ESLint с автофиксом
pnpm format       # Prettier форматирование
pnpm typecheck    # Проверка типов
```

## Документация

| Документ                                                  | Описание                |
| --------------------------------------------------------- | ----------------------- |
| [CLAUDE.md](../../CLAUDE.md)                              | Краткий контекст для AI |
| [Target Architecture](../concepts/target-architecture.md) | Целевая архитектура     |
| [Specs](../specs/)                                        | Спецификации модулей    |
| [Roadmap](./roadmap.md)                                   | План развития           |
| [ADR](./adr/)                                             | Архитектурные решения   |
