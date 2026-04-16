# CLAUDE.md

## Project Overview
See [PROJECT.md](PROJECT.md) for the full project description, goals, and philosophy.

## Current Tasks
See [TODO.md](TODO.md) for what's done, in progress, and planned.

## Project Structure
- `docs/` — детальная проектная документация (наполняется по мере обсуждения).
  - `architecture.md` — фронт-архитектура, DI, платформенный слой
  - `database.md` — SQLite схема (локально) + reference на бэк-БД
  - `encryption.md` — E2E протокол, управление ключами
  - `api-contracts.md` — WSS события, HTTP ручки
  - `platform-services.md` — DI-сервисы и их платформенные реализации
  - `identity.md` — аккаунты, UIN, username, login-flow
  - `invites.md` — инвайты, feature flags, таблицы `invites`/`referrals`
  - `auth-devices.md` — JWT-пара, сессии/устройства, нейминг, кик
- `design/` — дизайн-файлы (Pencil .pen). Инструкции: [`design/CLAUDE.md`](design/CLAUDE.md).
- `nest-backend-example/` — справочный NestJS бэкенд (форк kuba-game, почищен). Не для продакшена — только как архитектурный референс.
  - [`nest-backend-example/BACKEND_ARCHITECTURE.md`](nest-backend-example/BACKEND_ARCHITECTURE.md) — описание слоёв (рекомендуемая + текущая).
  - [`nest-backend-example/BUGS.md`](nest-backend-example/BUGS.md) — известные баги.

## Tech Stack
**Frontend (один package.json, один `ng build` → 3 платформы):**
- Angular + TypeScript
- Capacitor — iOS, Android (загружают `dist/` в webview)
- Electron — Windows, macOS, Linux (грузит `dist/` через `file://`)
- Локальная БД: SQLite на каждом устройстве
- Реалтайм: WSS + RxJS

**Backend:** Node.js, удалённый сервер. Конкретный стек ещё не зафиксирован — см. [TODO.md](TODO.md) → "Decisions deferred".

## Key Commands
_To be added once project is initialized._

## Code Conventions
_To be defined._

## Important Decisions
- **Single `package.json`** для Angular + Capacitor + Electron. Платформенный DI-слой на рантайме определяет окружение. Scripts разделяют таргеты сборки.
- **Документация в `docs/`**, а не `.claude/docs/` — последняя зарезервирована под конфиги агента.
- **`PROTOCOL_normisy.md`** — временный файл с исходной спекой. Удаляется после переноса всех договорённостей в `docs/` и `PROJECT.md`.
- **Платформенный слой:** abstract class + `useFactory` для каждого сервиса. Standalone-компоненты Angular, провайдеры в `app.config.ts`. Браузер грузит Angular полностью, но видит только лендинг + заглушку — никакой регистрации, логина, мессенджера или настроек в вебе. Структура папок — по фиче (`services/storage/`, `services/notifications/`). Tree-shaking платформенных impl не делается — принят trade-off ради single-bundle. Подробнее: [`docs/platform-services.md`](docs/platform-services.md).
- **Универсальный ID для всех таблиц БД:** `{uuid-v7}_{unixtime-ms-13}`. Подробнее: [`docs/database.md`](docs/database.md).
- **Идентификация пользователей:** login = UIN (числовой, 4–10 цифр, генерируется асинхронно после регистрации). Username — отдельная опциональная фича "для своих", выдаётся только админом. Раздельные таблицы `accounts` и `uins`, "красивые" UIN резервируются заранее. Подробнее: [`docs/identity.md`](docs/identity.md).
- **Закрытая регистрация по инвайтам:** 10-значный код, одноразовый, с TTL. У каждого аккаунта `invites_remaining` (старт = 3). Отзыв кода возвращает +1, истечение TTL — нет. Feature flags приходят с бэка по API. Подробнее: [`docs/invites.md`](docs/invites.md).
- **Авторизация и устройства:** JWT-пара (access 15 сек / refresh 30 дней, оба через env). Сессия = устройство в одной таблице `sessions`. Лимит устройств через env (default 20). Нейминг: `nickname ?? system_name`, прозвище видно другим. Кик через удаление сессии + WSS-сигнал. Подробнее: [`docs/auth-devices.md`](docs/auth-devices.md).
