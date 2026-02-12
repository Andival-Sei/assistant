# Настройка разработки

> **Тип:** Guide  
> **Цель:** Настроить окружение для комфортной разработки  
> **Аудитория:** Разработчики

## Обзор

Это руководство описывает рекомендуемую настройку IDE и инструментов для работы с проектом.

## Предварительные требования

- [ ] Проект установлен ([Начало работы](./getting-started.md))
- [ ] VS Code или Cursor ([скачать](https://code.visualstudio.com/))

## Рекомендуемые расширения VS Code

### Обязательные

| Расширение                | ID                          | Назначение              |
| ------------------------- | --------------------------- | ----------------------- |
| ESLint                    | `dbaeumer.vscode-eslint`    | Линтинг                 |
| Prettier                  | `esbenp.prettier-vscode`    | Форматирование          |
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss` | Автодополнение Tailwind |

### Рекомендуемые

| Расширение               | ID                         | Назначение         |
| ------------------------ | -------------------------- | ------------------ |
| TypeScript Importer      | `pmneo.tsimporter`         | Автоимпорт         |
| Error Lens               | `usernamehw.errorlens`     | Ошибки inline      |
| GitLens                  | `eamodio.gitlens`          | Git информация     |
| Pretty TypeScript Errors | `yoavbls.pretty-ts-errors` | Читаемые ошибки TS |

### Установка всех расширений

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension pmneo.tsimporter
code --install-extension usernamehw.errorlens
```

## Настройки VS Code

Создайте или обновите `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.suggest.autoImports": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Настройки проекта

### ESLint

Конфигурация в `eslint.config.mjs`. Основные правила:

- React Hooks rules
- TypeScript strict mode
- Prettier интеграция

### Prettier

Конфигурация в `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2
}
```

### TypeScript

Конфигурация в `tsconfig.json`:

- Strict mode включён
- Path alias: `@/*` → `./src/*`

## Workflow разработки

### 1. Запуск dev-сервера

```bash
pnpm dev
```

### 2. Работа с кодом

- Сохранение файла → автоформатирование + автофикс ESLint
- Ошибки видны inline (Error Lens)
- Tailwind классы автодополняются

### 3. Перед коммитом

```bash
pnpm lint        # Проверка ESLint
pnpm typecheck   # Проверка типов
```

Или всё сразу:

```bash
pnpm lint && pnpm typecheck
```

## Полезные скрипты

### Форматирование всего проекта

```bash
pnpm format
```

### Исправление ESLint ошибок

```bash
pnpm lint:fix
```

### Проверка типов

```bash
pnpm typecheck
```

## Отладка

### React DevTools

Установите расширение [React DevTools](https://react.dev/learn/react-developer-tools) для браузера.

### Vite DevTools

В dev режиме доступен overlay с ошибками. Нажмите на ошибку для перехода к файлу.

### Console

Используйте `console.log` для отладки. В production они будут удалены (если настроен tree-shaking).

## Частые проблемы

### ESLint не работает

1. Убедитесь, что расширение установлено
2. Перезапустите VS Code
3. Проверьте Output → ESLint

### Tailwind не автодополняет

1. Установите расширение Tailwind CSS IntelliSense
2. Добавьте настройки `tailwindCSS.experimental.classRegex`
3. Перезапустите VS Code

### Импорты не работают

Убедитесь, что `tsconfig.json` содержит:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## См. также

- [Начало работы](./getting-started.md)
- [Git Workflow](../processes/git-workflow.md)
- [Соглашение о коммитах](../processes/commit-convention.md)
