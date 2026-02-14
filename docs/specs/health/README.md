# Модуль: Health

> **Статус:** In Progress  
> **Приоритет:** High  
> **Зависимости:** Auth (Supabase), Dashboard UI

## Обзор

Health-модуль собирает метрики пользователя из нескольких источников:

- ручной ввод (MVP, доступно сразу);
- интеграции с устройствами/сервисами (поэтапно);
- ограниченные browser capabilities (как вспомогательный канал).

Модуль не ставит диагнозы и не заменяет врача. Цель: удобный персональный health-дашборд и база для AI-аналитики привычек.

## Ключевой принцип интеграций

Для пользователя подключение должно быть максимально простым: один список провайдеров, одна кнопка подключения, автоматическая синхронизация, ручной ввод как fallback.

### Что такое OAuth API (простыми словами)

OAuth — это вход через внешний сервис без передачи нам логина/пароля пользователя.

Поток выглядит так:

1. Пользователь нажимает `Подключить Fitbit`.
2. Мы отправляем его на страницу Fitbit.
3. Fitbit спрашивает разрешения и возвращает нас в приложение с `code`.
4. Наш backend меняет `code` на токены и хранит их безопасно.
5. После этого можем синхронизировать данные по API Fitbit.

### Что можно сделать прямо в браузере

- Показать состояние интеграций и запускать OAuth-потоки.
- Собирать ограниченные данные браузера (не клинические и не системные health-данные).

### Что нельзя сделать только браузером

- Полноценный доступ к Apple Health / Health Connect без мобильного bridge.
- Надёжный фоновый импорт данных с носимых устройств без backend callback/jobs.

## Интеграционная стратегия (поэтапно)

1. **MVP (уже стартовал):**
   - раздел `/dashboard/health`;
   - ручной ввод метрик;
   - реестр интеграций со статусами;
   - хранение в Supabase (`health_metric_entries`, `health_integrations`).
2. **Phase 2 (OAuth-провайдеры):**
   - Fitbit / Garmin / Oura / Withings / Polar / WHOOP;
   - backend endpoint для OAuth callback;
   - периодический sync job;
   - дедупликация и нормализация событий в единую модель.
3. **Phase 3 (Mobile bridge):**
   - companion flow для Apple Health / Health Connect;
   - secure token handoff в backend;
   - синхронизация в тот же унифицированный pipeline.

## Данные MVP

| Поле                 | Тип          | Источник           |
| -------------------- | ------------ | ------------------ |
| `steps`              | integer      | manual/integration |
| `sleep_hours`        | numeric      | manual/integration |
| `water_ml`           | integer      | manual/integration |
| `weight_kg`          | numeric      | manual/integration |
| `resting_heart_rate` | integer      | manual/integration |
| `systolic_bp`        | integer      | manual/integration |
| `diastolic_bp`       | integer      | manual/integration |
| `mood_score`         | integer 1-10 | manual             |
| `note`               | text         | manual             |

## UX правила

- Пользователь всегда может начать без интеграций (ручной ввод < 30 секунд).
- Интеграции показываются в одном списке с прозрачным статусом.
- При недоступности авто-синхронизации предлагается fallback на ручной ввод.
- На мобильном все ключевые действия доступны одной рукой.

## Следующие шаги

- [x] Создать базовую схему данных и RLS.
- [x] Добавить UI Health-раздела в dashboard.
- [x] Реализовать OAuth callback flow для первого провайдера (Fitbit).
- [ ] Добавить refresh-token цикл и фоновую синхронизацию метрик Fitbit.
- [ ] Добавить ingestion pipeline и нормализацию внешних метрик.
- [ ] Добавить тренды и AI-инсайты на базе исторических данных.

## Runtime setup (для Fitbit)

Нужно задать секреты в Supabase Edge Functions:

- `APP_URL` — фронтенд URL (например, `http://localhost:5173` в dev)
- `FITBIT_CLIENT_ID`
- `FITBIT_CLIENT_SECRET`
- `FITBIT_REDIRECT_URI` = `https://<project-ref>.supabase.co/functions/v1/health-oauth-callback`

И тот же `FITBIT_REDIRECT_URI` должен быть зарегистрирован в настройках Fitbit App.

## См. также

- [Обзор модулей](../README.md)
- [Roadmap](../../meta/roadmap.md)
