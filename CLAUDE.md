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
  - `database-schema.md` — **канон DDL**: все таблицы (Drizzle TS), индексы, cascade-правила, транзакционные сценарии. Источник правды для миграций
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
  - `frontend-architecture.md` — структура папок фронта, конвенции фич, адаптив, платформенный DI, CSS
- `design/` — дизайн-файлы (Pencil .pen). Инструкции: [`design/CLAUDE.md`](design/CLAUDE.md).
- `nest-backend-example/` — справочный NestJS бэкенд (форк kuba-game, почищен). **Только архитектурный референс**, удалить после миграции паттернов.
  - [`nest-backend-example/BACKEND_ARCHITECTURE.md`](nest-backend-example/BACKEND_ARCHITECTURE.md) — описание слоёв (рекомендуемая 4-слойная + текущая 5-слойная).
  - [`nest-backend-example/BUGS.md`](nest-backend-example/BUGS.md) — известные баги.
  - **⚠ Критические отличия от реального проекта (НЕ копировать вслепую):**
    - Пример использует **MySQL** → проект использует **PostgreSQL 16** (`drizzle-orm/postgres-js`, не `drizzle-orm/mysql2`).
    - Пример использует **bcrypt** → проект использует **argon2id** (см. `docs/recovery.md`).
    - Пример хранит токены в **cookies** → проект использует **`Authorization: Bearer`** header + WSS-ротацию (см. `docs/auth-devices.md`).
    - Пример оборачивает всё в **Result<T>** → проект использует **NestJS exceptions** (рекомендуемая архитектура из Части 1 `BACKEND_ARCHITECTURE.md`).
    - Пример использует **`/api/`** prefix → проект использует **`/api/v1/`** (см. `docs/api-contracts.md`).
  - **Что брать из примера:** 4-слойную архитектуру (Presentation → Application → Domain → Persistence), паттерн портов (abstract class в Domain, реализация в Persistence), структуру модулей, нейминг файлов. **Не брать:** MySQL-типы, bcrypt, cookies, Result-обёртки, 5-слойную архитектуру.

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

Все команды запускаются из `application-with-frontend/`.

```bash
# Разработка (браузер)
npm start                # ng serve → http://localhost:4200

# Линтинг
npm run lint             # eslint src (strict-type-checked + angular-eslint + jsdoc)

# Сборка
npm run build            # ng build (production)

# Electron (десктоп)
npm run dev:electron     # dev-режим с hot reload Angular
npm run build:electron   # production сборка

# Capacitor (iOS)
npm run dev:ios          # сборка + sync + открыть Xcode
npm run cap:sync         # ng build + cap sync

# Тесты
npm run test             # ng test
```

Бэкенд (`backend/`): `npm run start:dev` — dev-режим, `npm run build` — production.

## Code Conventions

- **Standalone components** — без NgModule, провайдеры в `app.config.ts`.
- **ChangeDetectionStrategy.OnPush** — для всех компонентов.
- **BEM** в CSS (`.block__element--modifier`).
- **Strict ESLint** — `typescript-eslint strict-type-checked` + `angular-eslint` + `jsdoc/require-jsdoc` (JSDoc для всех публичных API).
- **TypeScript strict** — `strict: true` + `noPropertyAccessFromIndexSignature`, `noUncheckedIndexedAccess` и другие extra-strict опции.
- **Private fields** — `_prefix` для приватных свойств/методов.
- **Camelcase** в TS, **snake_case** в JSON API.
- **Подробнее об архитектуре фронта:** [`docs/frontend-architecture.md`](docs/frontend-architecture.md).

## Important Decisions

- **Single `package.json` для фронта** (внутри `application-with-frontend/`): Angular + Capacitor + Electron. Платформенный DI-слой на рантайме определяет окружение. Scripts разделяют таргеты сборки. У бэка свой `package.json` в `backend/`.
- **Backend stack:** NestJS + PostgreSQL 16 + Drizzle ORM + Redis (BullMQ для очереди UIN, опциональный SessionStore через env). Подробнее: [`docs/backend-stack.md`](docs/backend-stack.md).
- **Документация в `docs/`**, а не `.claude/docs/` — последняя зарезервирована под конфиги агента.
- **Платформенный слой:** abstract class + `useFactory` для каждого сервиса. Standalone-компоненты Angular, провайдеры в `app.config.ts`. Браузер грузит Angular полностью, но видит только лендинг + заглушку — никакой регистрации, логина, мессенджера или настроек в вебе. Структура папок — по фиче (`core/services/storage/`, `core/services/notifications/`). Tree-shaking платформенных impl не делается — принят trade-off ради single-bundle. Подробнее: [`docs/platform-services.md`](docs/platform-services.md).
- **Универсальный ID для всех таблиц БД:** `{uuid-v7}_{unixtime-ms-13}`. Подробнее: [`docs/database.md`](docs/database.md).
- **Идентификация пользователей:** login = UIN (числовой, 4–10 цифр, генерируется асинхронно после регистрации). Username — отдельная опциональная фича "для своих", выдаётся только админом. Раздельные таблицы `accounts` и `uins`, "красивые" UIN резервируются заранее. Подробнее: [`docs/identity.md`](docs/identity.md).
- **Закрытая регистрация по инвайтам:** 10-значный код, одноразовый, с TTL. У каждого аккаунта `invites_remaining` (старт = 3). Отзыв кода возвращает +1, истечение TTL — нет. Feature flags приходят с бэка по API. Подробнее: [`docs/invites.md`](docs/invites.md).
- **Авторизация и устройства:** JWT-пара (access 15 сек / refresh 30 дней, оба через env). Сессия = устройство в одной таблице `sessions`. Лимит устройств через env (default 20). Нейминг: `nickname ?? system_name`, прозвище видно другим. Кик через удаление сессии + WSS-сигнал. Ротация в WSS через `token_refresh` / `tokens_updated` сообщения (без реконнекта). Refresh token rotation + reuse detection обязательны. Подробнее: [`docs/auth-devices.md`](docs/auth-devices.md).
- **Пароль и recovery:** пароль хешится на сервере (argon2id, plain-text по TLS — допустимо). Мастер-ключ устройства случайный (Signal-style), не деривируется из пароля → смена пароля не ломает чаты. Recovery — через секретные Q/A (микс preset + свои, без ограничения количества, OR-логика). Recovery возвращает аккаунт, НЕ чаты. Без настроенных Q/A восстановление невозможно. Подробнее: [`docs/recovery.md`](docs/recovery.md).
- **Чаты и E2E:** чат = между двумя устройствами (device-to-device), UI показывает аккаунт. ECDH → AES-256-GCM (гибридная схема). Название чата не шифруется, уникально per device-pair (case-insensitive). Оптимистичная отправка (pending_key). Forward secrecy не в MVP. Подробнее: [`docs/encryption.md`](docs/encryption.md).
- **Мульти-девайс UX:** чаты не синхронизируются между моими устройствами (per-device модель). На новом устройстве (recovery / переустановка / второй девайс) фронт показывает список «осиротевших собеседников» — `account_id`-ов, с кем были чаты с других сессий. При создании первого чата на каждом устройстве — onboarding-модалка с объяснением модели. Полная миграция чатов — в потом-потом. Подробнее: [`docs/devices-and-chats.md`](docs/devices-and-chats.md).
- **API контракты:** REST + WSS. Префикс `/api/v1/`. Resource/action нейминг (`account/create`, `session/read-list`, `invite/revoke/:id`). Один глобальный WSS endpoint `wss://normisy.app/ws`, авторизация первым сообщением. Ошибки в стиле NestJS HttpException + поле `code`. Подробнее: [`docs/api-contracts.md`](docs/api-contracts.md).

---

## Язык общения

- **Отвечать пользователю всегда на русском языке** — даже если вопрос задан на другом языке.
- Внутренние размышления (thinking) — на любом языке, как удобно модели.
- Код, комментарии в коде, имена переменных — по конвенциям проекта (английский для кода, русский для JSDoc/комментариев где уместно).

---

## Разрешения

- Claude может свободно создавать, редактировать и удалять любые файлы и папки внутри `~/coding/norms/` и всех дочерних директорий — без дополнительных подтверждений.
- `CLAUDE.md` можно и нужно обновлять в процессе работы или после — при изменении конвенций, правил, стека или любых других инструкций.

---

## Git-правила

- **Коммиты** — делать по завершении логического блока работы, без лишних вопросов.
- **Push** — **никогда не пушить самостоятельно**. Всегда спрашивать пользователя: «Пушнуть?». Пользователь может запушить сам или пропустить — это его решение.

---

## Обязанности перед началом работы

Перед тем как писать код — явно сказать, **как будет проверена корректность результата**: `npx tsc --noEmit`, конкретный тест, ручной прогон в браузере, проверка в Postman и т.д. Одно предложение — достаточно. Это обязательно для каждой задачи, а не только нетривиальных.

## Обязанности после работы с кодом

После каждой рабочей сессии (или по ходу, если изменения значительные) Claude обязан:

1. **Обновить `TODO.md`** — перенести выполненное в `Done`, актуализировать `In Progress` и `Up Next`.
2. **Обновить документацию** — если изменилась архитектура, добавлен новый паттерн, новая фича или новое решение:
   - `docs/frontend-architecture.md` — при изменениях структуры фронта, конвенций, новых паттернов (modal-система, платформенный DI и т.д.)
   - `docs/*.md` — соответствующий файл при изменении описанного в нём поведения
   - `CLAUDE.md` — при изменении стека, конвенций, разрешений или важных решений
3. **Обновить memory** (`/Users/elmirkuba/.claude/projects/-Users-elmirkuba-coding-norms/memory/`):
   - Актуализировать `project_state_*.md` — текущий прогресс, следующий шаг, ключевые решения.
   - Удалять старые файлы `project_state_*.md` при создании нового (не накапливать историю).
   - Добавлять новые `feedback_*.md` если пользователь скорректировал подход.
   - Обновлять `MEMORY.md`-индекс при каждом изменении состава файлов.
4. **Не накапливать долг** — не откладывать п.1–3 на потом. Всё делается по ходу или сразу по завершении блока работы.
