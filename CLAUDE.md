# CLAUDE.md

## Project Overview
See [PROJECT.md](PROJECT.md) for the full project description, goals, and philosophy.

## Current Tasks
See [TODO.md](TODO.md) for what's done, in progress, and planned.

## Project Structure
- `application-with-frontend/` — Angular + Capacitor + Electron (свой `package.json`, один `ng build` → 3 платформы).
- `backend/` — NestJS (свой `package.json`). Подробнее: [`docs/backend-stack.md`](docs/backend-stack.md).
- `docs/` — детальная проектная документация (наполняется по мере обсуждения).
  - `backend-stack.md` — NestJS, PostgreSQL, Drizzle, Redis, BullMQ, SessionStore-абстракция, структура репо, docker-compose
  - `database.md` — универсальный формат ID, общие конвенции БД
  - `encryption.md` — чаты, E2E шифрование (ECDH + AES-256-GCM), создание чата, доставка
  - `api-contracts.md` — HTTP-ручки (account/auth/session/invite/recovery/uin/chat/admin/system) и WSS-события (auth, ping, session_kicked, password_reset_via_recovery, uin_assigned)
  - `platform-services.md` — DI-сервисы и их платформенные реализации
  - `identity.md` — аккаунты, UIN, username, login-flow
  - `invites.md` — инвайты, feature flags, таблицы `invites`/`referrals`
  - `auth-devices.md` — JWT-пара, сессии/устройства, нейминг, кик
  - `message-statuses.md` — статусы сообщений (failed → pending_key → sent → delivered → read)
  - `privacy.md` — приватность (MVP: всё открыто, TODO: блокировка, контакты, мут)
  - `server.md` — роль сервера (транзитный), что знает/не знает, HTTPS vs WSS, синхронизация
  - `local-storage.md` — SQLite per-account, схемы таблиц, keychain для токенов и мастер-ключа
  - `push-notifications.md` — APNs/FCM, payload только `chat_id`, локальная расшифровка
  - `recovery.md` — восстановление пароля через секретные Q/A, что recovery восстанавливает (аккаунт, не чаты)
  - `devices-and-chats.md` — мульти-девайс UX, осиротевшие собеседники на новом устройстве, onboarding-модалка
- `design/` — дизайн-файлы (Pencil .pen). Инструкции: [`design/CLAUDE.md`](design/CLAUDE.md).
- `nest-backend-example/` — справочный NestJS бэкенд (форк kuba-game, почищен). Не для продакшена — только как архитектурный референс, удалить после миграции нужных паттернов.
  - [`nest-backend-example/BACKEND_ARCHITECTURE.md`](nest-backend-example/BACKEND_ARCHITECTURE.md) — описание слоёв (рекомендуемая + текущая).
  - [`nest-backend-example/BUGS.md`](nest-backend-example/BUGS.md) — известные баги.

## Tech Stack
**Frontend (`application-with-frontend/`, один `package.json`, один `ng build` → 3 платформы):**
- Angular + TypeScript
- Capacitor — iOS, Android (загружают `dist/` в webview)
- Electron — Windows, macOS, Linux (грузит `dist/` через `file://`)
- Локальная БД: SQLite на каждом устройстве
- Реалтайм: WSS + RxJS

**Backend (`backend/`, свой `package.json`):**
- NestJS + TypeScript
- PostgreSQL 16 + Drizzle ORM
- Redis (BullMQ для очереди UIN, опциональный SessionStore)
- Подробнее: [`docs/backend-stack.md`](docs/backend-stack.md).

## Key Commands
_To be added once project is initialized._

## Code Conventions
_To be defined._

## Important Decisions
- **Single `package.json` для фронта** (внутри `application-with-frontend/`): Angular + Capacitor + Electron. Платформенный DI-слой на рантайме определяет окружение. Scripts разделяют таргеты сборки. У бэка свой `package.json` в `backend/`.
- **Backend stack:** NestJS + PostgreSQL 16 + Drizzle ORM + Redis (BullMQ для очереди UIN, опциональный SessionStore через env). Подробнее: [`docs/backend-stack.md`](docs/backend-stack.md).
- **Документация в `docs/`**, а не `.claude/docs/` — последняя зарезервирована под конфиги агента.
- **Платформенный слой:** abstract class + `useFactory` для каждого сервиса. Standalone-компоненты Angular, провайдеры в `app.config.ts`. Браузер грузит Angular полностью, но видит только лендинг + заглушку — никакой регистрации, логина, мессенджера или настроек в вебе. Структура папок — по фиче (`services/storage/`, `services/notifications/`). Tree-shaking платформенных impl не делается — принят trade-off ради single-bundle. Подробнее: [`docs/platform-services.md`](docs/platform-services.md).
- **Универсальный ID для всех таблиц БД:** `{uuid-v7}_{unixtime-ms-13}`. Подробнее: [`docs/database.md`](docs/database.md).
- **Идентификация пользователей:** login = UIN (числовой, 4–10 цифр, генерируется асинхронно после регистрации). Username — отдельная опциональная фича "для своих", выдаётся только админом. Раздельные таблицы `accounts` и `uins`, "красивые" UIN резервируются заранее. Подробнее: [`docs/identity.md`](docs/identity.md).
- **Закрытая регистрация по инвайтам:** 10-значный код, одноразовый, с TTL. У каждого аккаунта `invites_remaining` (старт = 3). Отзыв кода возвращает +1, истечение TTL — нет. Feature flags приходят с бэка по API. Подробнее: [`docs/invites.md`](docs/invites.md).
- **Авторизация и устройства:** JWT-пара (access 15 сек / refresh 30 дней, оба через env). Сессия = устройство в одной таблице `sessions`. Лимит устройств через env (default 20). Нейминг: `nickname ?? system_name`, прозвище видно другим. Кик через удаление сессии + WSS-сигнал. Ротация в WSS через `token_refresh` / `tokens_updated` сообщения (без реконнекта). Refresh token rotation + reuse detection обязательны. Подробнее: [`docs/auth-devices.md`](docs/auth-devices.md).
- **Пароль и recovery:** пароль хешится на сервере (argon2id, plain-text по TLS — допустимо). Мастер-ключ устройства случайный (Signal-style), не деривируется из пароля → смена пароля не ломает чаты. Recovery — через секретные Q/A (микс preset + свои, без ограничения количества, OR-логика). Recovery возвращает аккаунт, НЕ чаты. Без настроенных Q/A восстановление невозможно. Подробнее: [`docs/recovery.md`](docs/recovery.md).
- **Чаты и E2E:** чат = между двумя устройствами (device-to-device), UI показывает аккаунт. ECDH → AES-256-GCM (гибридная схема). Название чата не шифруется, уникально per device-pair (case-insensitive). Оптимистичная отправка (pending_key). Forward secrecy не в MVP. Подробнее: [`docs/encryption.md`](docs/encryption.md).
- **Мульти-девайс UX:** чаты не синхронизируются между моими устройствами (per-device модель). На новом устройстве (recovery / переустановка / второй девайс) фронт показывает список «осиротевших собеседников» — `account_id`-ов, с кем были чаты с других сессий. При создании первого чата на каждом устройстве — onboarding-модалка с объяснением модели. Полная миграция чатов — в потом-потом. Подробнее: [`docs/devices-and-chats.md`](docs/devices-and-chats.md).
- **API контракты:** REST + WSS. Префикс `/api/v1/`. Resource/action нейминг (`account/create`, `session/read-list`, `invite/revoke/:id`). Один глобальный WSS endpoint `wss://normisy.app/ws`, авторизация первым сообщением. Ошибки в стиле NestJS HttpException + поле `code`. Подробнее: [`docs/api-contracts.md`](docs/api-contracts.md).
