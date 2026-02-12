# Соглашение о коммитах

> **Тип:** Process  
> **Цель:** Стандартизировать сообщения коммитов  
> **Аудитория:** Все разработчики

## Обзор

Проект использует [Conventional Commits](https://www.conventionalcommits.org/) для стандартизации сообщений коммитов.

## Формат

```
<тип>(<область>): <описание>

[тело]

[футер]
```

### Обязательные части

- **тип** — категория изменения
- **описание** — краткое описание (до 72 символов)

### Опциональные части

- **область** — часть проекта (в скобках)
- **тело** — детальное описание
- **футер** — ссылки на issues, breaking changes

## Типы коммитов

| Тип        | Описание                          | Пример                                |
| ---------- | --------------------------------- | ------------------------------------- |
| `feat`     | Новая функциональность            | `feat: add transaction form`          |
| `fix`      | Исправление бага                  | `fix: correct balance calculation`    |
| `docs`     | Документация                      | `docs: update README`                 |
| `style`    | Форматирование (не влияет на код) | `style: format with prettier`         |
| `refactor` | Рефакторинг (не feat, не fix)     | `refactor: extract hooks`             |
| `test`     | Тесты                             | `test: add unit tests for hooks`      |
| `chore`    | Прочее (сборка, зависимости)      | `chore: update dependencies`          |
| `perf`     | Улучшение производительности      | `perf: memoize expensive computation` |

## Примеры

### Простой коммит

```
feat: add account creation form
```

### С областью

```
feat(finance): add account creation form
```

### С телом

```
fix(finance): correct balance calculation

The balance was incorrectly summing transactions
without considering the currency conversion.
```

### С футером

```
feat(auth): add Google OAuth login

Implements Google OAuth using Supabase Auth.

Closes #123
```

### Breaking Change

```
feat(api)!: change transaction response format

BREAKING CHANGE: The transaction response now includes
the category object instead of just category_id.
```

## Правила

### Описание

- Начинать с маленькой буквы
- Без точки в конце
- Использовать повелительное наклонение (add, fix, change)
- До 72 символов

**Хорошо:**

```
feat: add transaction list component
fix: handle empty category error
```

**Плохо:**

```
feat: Added transaction list component.  # Прошедшее время, точка
fix: Fixes the error                     # Заглавная, не повелительное
```

### Тело

- Отделяется пустой строкой от описания
- Объясняет "что" и "почему", а не "как"
- Переносы строк по 72 символа

### Область (scope)

Используйте для указания модуля или части проекта:

- `finance`, `health`, `assistant`, `family` — модули
- `auth` — авторизация
- `ui` — UI компоненты
- `docs` — документация

## Автоматизация

### semantic-release

Conventional Commits позволяют использовать [semantic-release](https://github.com/semantic-release/semantic-release) для автоматического:

- Определения версии (major/minor/patch)
- Генерации CHANGELOG
- Создания релизов

### Версионирование

| Тип коммита       | Версия        |
| ----------------- | ------------- |
| `fix`             | Patch (0.0.X) |
| `feat`            | Minor (0.X.0) |
| `BREAKING CHANGE` | Major (X.0.0) |

## Инструменты

### commitlint

Проверяет формат коммитов (если настроен):

```bash
# Установка
pnpm add -D @commitlint/cli @commitlint/config-conventional

# Конфигурация (.commitlintrc.json)
{
  "extends": ["@commitlint/config-conventional"]
}
```

### Husky

Запускает commitlint при коммите:

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

## Частые ошибки

### Слишком общие описания

**Плохо:** `fix: fix bug`  
**Хорошо:** `fix(finance): handle null category in transaction form`

### Несколько изменений в одном коммите

Разделяйте логически разные изменения на отдельные коммиты.

### Неправильный тип

- Рефакторинг без изменения поведения → `refactor`, не `fix`
- Новая функция → `feat`, не `chore`

## См. также

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Workflow](./git-workflow.md)
