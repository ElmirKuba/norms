# TODO

## Done

### Инфраструктура фронта
- Строгий ESLint (typescript-eslint strict-type-checked + jsdoc + angular-eslint) + tsconfig extra-strict
- `@angular/material` + `@angular/cdk` + `@angular/animations` установлены, `provideAnimations()` в `app.config.ts`
- `docs/frontend-architecture.md` — архитектура фронта, конвенции папок, типы, сервисы

### Лендинг (веб)
- `MainWebComponent` — layout с header/footer, burger-меню (<640px), адаптив мобильный
- `WelcomeWebComponent` — главная (`/web/welcome`): badge, promo, кнопки скачивания с детектом ОС
- `AboutWebComponent` — «О проекте» (`/web/about`): badge, promo, 3 feature-карточки
- `SecurityWebComponent` — «Безопасность» (`/web/security`): badge, promo, 3 feature-карточки
- SVG-иконки для badge (info, lock) и feature-карточек About и Security

### Shared компоненты
- `ButtonSharedComponent` — primary / secondary, `ng-content`, `disabled`, `clicked`
- `InputSharedComponent` — text/password, `[(value)]` two-way binding

### Modal-система (`shared/modals/`)
- `DialogModalComponent` — универсальная рамка (Способ A): иконка, заголовок, текст/компонент, кнопки
- `ModalHeaderSharedComponent` — иконка (Preloader/Done/Error/Info/Warning) + title через `ng-content`
- `ModalContentSharedComponent` — контентная область, поддержка `NgComponentOutlet` для встроенных компонентов
- `ModalFooterSharedComponent` — кнопки с поддержкой vertical/reversed layout
- `DialogModalData<T>` — типизированный generic-контракт конфигурации
- `ModalHeaderIcon` enum, `MODAL_BOTTOM_SHEET_PARAMS`, `MODAL_CENTER_PARAMS`
- Global styles в `styles.scss`: сброс Material MDC, панели `bottom-sheet` и `center`

### Application экраны (auth/UIN флоу)
- `WelcomeApplicationComponent` — стартовый экран: логотип, «Зарегистрироваться» / «Войти»
- `AuthShellComponent` — shell для auth-экранов: header с кнопкой «назад» + `<router-outlet>`
- `InviteCodeApplicationComponent` — ввод 10-значного кода, авто-форматирование XXXX-XXXX-XX
- `CreateAccountApplicationComponent` — ввод пароля (мин. 8 символов), navigate(main, pendingUin)
- `LoginApplicationComponent` — логин + пароль, «Забыли пароль?»
- `UinAssignedApplicationComponent` — UIN-карточка, копирование, «Продолжить»
- `UinModalService.openUinPending()` — bottom-sheet «Назначаем UIN...» над `application/main`
- `MainApplicationComponent` — shell (таббар + router-outlet); при `state.pendingUin` открывает UIN-модалку
- `application.routes.ts` — lazy-loading всех экранов, роут `uin/pending` удалён (теперь модалка)

### Application экраны (чаты)
- `ChatsApplicationComponent` — список чатов с моками: аватар, имя, последнее сообщение, время, badge непрочитанных
- `ChatDetailApplicationComponent` — экран чата с моками: пузырьки (своё/чужое), статусы (sent/delivered/read), поле ввода + отправка; таббар виден
- `ChatsStateService` — хранит `activeChatId` (signal); таб «Чаты» возвращает в открытый чат при переключении
- Мок-ID чатов и сообщений в формате `{uuid-v7}_{unixtime-13ms}`

### Application экраны (search / settings / profile)
- `SearchApplicationComponent` — поле ввода, фильтрация моков по имени/UIN, кнопка «Написать»
- `SettingsApplicationComponent` — секции с иконками, все пункты кликабельны
- `ProfileApplicationComponent` — карточка с аватаром/инициалами, UIN, имя, username

### Application экраны (auth recovery + settings sub-screens)
- `RecoveryApplicationComponent` — 3 шага: UIN → выбор вопроса + ответ → новый пароль; кнопка «Забыли пароль?» в login подключена
- `SettingsAccountComponent` — имя, UIN, username, заглушки смены имени/пароля/username; удалить аккаунт
- `SettingsDevicesComponent` — список моков устройств, «текущее» badge, кнопка «Завершить» удаляет устройство из списка
- `SettingsPrivacyComponent` — MVP-информация + будущие переключатели disabled
- `SettingsRecoveryQuestionsComponent` — список Q&A с удалением, добавление через preset/свой вопрос, предупреждение об E2E (чекбокс)

### Application экраны (onboarding / new-device / user-profile / invites)
- `ChatOnboardingService` — модалка «Как работают чаты в Нормисах», показывается один раз за сессию при нажатии «Написать» в поиске или профиле
- `NewDeviceApplicationComponent` (`/application/new-device`) — список orphan peers после recovery/переустановки, кнопка «Понятно»
- `UserProfileApplicationComponent` (`/application/main/user/:accountId`) — профиль чужого пользователя, кнопка «Написать» с онбордингом
- `SettingsInvitesComponent` (`/application/main/settings/invites`) — счётчик остатка, создание кода (мок), отзыв, копирование, список приглашённых, кто пригласил

### Application экраны (chat statuses / create chat / change password / global events)
- `ChatDetailApplicationComponent` — pending_key баннер, failed bubble (красный), кнопка «Повторить» (мок), pending_key пузырёк (затемнён + dashed круг)
- `ChatsApplicationComponent` — иконка pending_key в превью списка чатов
- `CreateChatModalComponent` + `CreateChatModalService` — модалка выбора устройства собеседника (Способ B), открывается после онбординга в UserProfile
- `MockSearchUser.devices` — массив `MockUserDevice[]` (deviceId, label) для каждого пользователя
- `SettingsChangePasswordComponent` (`/application/main/settings/change-password`) — форма (текущий/новый/повтор), show/hide пароля, мок-сабмит с spinner → success-экран; кнопка «Сменить пароль» в AccountSettings теперь кликабельна
- `SettingsDevicesComponent` — подтверждение кика через `DialogModalComponent` (ModalHeaderIcon.Warning, isConfirmModal), inline-переименование устройства
- `SettingsInvitesComponent` — модалка успеха после createCode() (ModalHeaderIcon.Done с кодом)
- `SessionKickedService` (`main/services/`) — глобальный сервис, открывает bottom-sheet «Сессия завершена», после OK редиректит на `/application/welcome`; mock-триггер на экране Профиля
- `MainApplicationComponent` — `passwordResetBanner` signal, желтый баннер «Пароль был сброшен через восстановление», закрывается крестиком; mock-триггер на экране Профиля
- `ProfileApplicationComponent` — секция «Мок-события» с двумя кнопками для тестирования WSS событий

### ESLint (оба проекта)
- `switch-exhaustiveness-check` — все кейсы discriminated union обязаны быть покрыты (поймал непокрытый `AppPlatform.WEB`)
- `no-shadow` — запрет перекрытия переменных внешней области видимости
- `promise-function-async` (`checkMethodDeclarations: false`) — функция, возвращающая Promise, обязана быть async
- `TSEnumMember` в `contexts` у `jsdoc/require-jsdoc` — JSDoc обязателен на каждом члене enum

### Backend bootstrap
- NestJS 11, 4-layer архитектура (presentation / application / domain / persistence / common / config)
- Строгий tsconfig (extra-strict) + ESLint (strict-type-checked + jsdoc) идентичный фронту
- Docker compose: postgres 16, redis 7, pgAdmin 4 (port 8081), backend (комментируется для host-разработки)
- `docker/sql-files/init.sql` → `CREATE EXTENSION citext` (в docker-entrypoint-initdb.d)
- `docker/sql-files/comments.sql` → `COMMENT ON TABLE/COLUMN` (применять через `npm run db:comments`)
- `npm run db:setup` = `db:push` + `db:comments`
- Drizzle ORM (`drizzle-orm/node-postgres` + `pg`, CommonJS-совместимо)
- Полная схема БД: `accounts` (citext username), `uins` (text number, partial unique index), `sessions`, `invites`, `referrals`, `recovery_questions`
- `custom-types.ts` (citext, bytea), `enums.ts` (platformEnum, chatStatusEnum)
- `AccountRepository` (DrizzleAccountRepository) — CRUD, timestamps → Date
- `generateId()` утилита — формат `{uuid-v7}_{unix-ms}`
- ESLint override для `schemas/*.ts` (Drizzle callback не аннотируется стандартными средствами)
- `SchemaColumnMap<T>` type + `satisfies` на объекте колонок — devtime-контроль полноты схем (каждый ключ интерфейса строки обязан быть задан, типы колонок не теряются)
- `ErrorCode` enum (UPPER_CASE), `ErrorMessage: Record<ErrorCode, string>`, `makeError(code): ErrorBody` — единый источник кодов и текстов ошибок, убраны магические строки во всех use-cases

### AuthModule (шаг 2)
- `AccountModule`: `POST /account/create` (регистрация + атомарная транзакция инвайт), `POST /account/auth` (логин UIN/username), `POST /account/logout`
- `SessionModule`: `POST /session/refresh` (refresh token rotation + reuse detection)
- `InviteModule`: `POST /invite/check` (rate-limit 10/15min по IP)
- `AuthModule` (shared): `JwtGuard` (JWT-only), `@CurrentUser()` декоратор, `JwtModule` с env-TTL
- `RedisModule`: `ioredis` провайдер, используется для rate-limiting
- `PersistenceModule`: добавлены `SessionRepository`, `InviteRepository`; `DrizzleModule` реэкспортируется для транзакций в use-cases
- `generateRefreshToken()` + `sha256Hex()` в `common/utils/crypto.util.ts`
- ESLint override для `*.dto.ts` (snake_case поля JSON) + расширение naming-convention (typeProperty/objectLiteralProperty snake_case)
- Docs: `docs/api-contracts.md` обновлён — `system_name` + `platform` в `account/create` request
- JWT payload расширен: добавлены `platform` и `isAdmin`

### UIN-генерация (шаг 3)
- `UinModule`: `BullMQ` очередь `uin-generation`, `UinService.enqueueGeneration()`, `UinGenerationProcessor` (retry 4→10 цифр, pg 23505 collision handling)
- `GET /uin/read-status` — статус генерации (pending/assigned) для поллинга
- `CreateAccountUseCase` вызывает `enqueueGeneration` после транзакции

### Recovery (шаг 6)
- `GET /recovery/preset-questions` — статический список пресет-вопросов (публичный)
- `POST /recovery/question/create` — создать Q/A пару (argon2id-хеш ответа, нормализация)
- `GET /recovery/question/read-list` — список своих вопросов без хешей
- `PATCH /recovery/question/update/:id` — изменить вопрос и/или ответ
- `DELETE /recovery/question/delete/:id` — удалить Q/A пару
- `GET /recovery/read-questions-for-login?login=` — список вопросов аккаунта для «Забыл пароль» + rate-limit check
- `POST /recovery/check-answer` — проверка ответа + эскалирующий rate-limit (5 неудач → 1ч/24ч/7д) + выдача reset_token (Redis EX 600)
- `POST /recovery/reset-password` — смена пароля по одноразовому reset_token
- Очистка `recovery_fail_count` и `recovery_fail_level` при успешном логине
- `PublicRecoveryQuestion` — вынесен в порт-интерфейс (без хеша)
- `ErrorCode` расширен: 7 новых кодов (RECOVERY_QUESTION_NOT_FOUND, NOT_YOUR_RECOVERY_QUESTION, RECOVERY_NOT_CONFIGURED, WRONG_ANSWER, RECOVERY_RATE_LIMITED, RESET_TOKEN_INVALID, RESET_TOKEN_EXPIRED)
- Postman: Флоу 6 с авто-сохранением `recovery_account_id`, `recovery_question_id`, `reset_token`
- TODO (шаг 7): после `reset-password` — WSS `password_reset_via_recovery` всем сессиям

### Account read + Session list (шаг 5, частично)
- `GET /account/read` — свой профиль (полный: id, uin, username, invites_remaining, is_admin, created_at) и чужой (без invites_remaining и is_admin); query `?id=` или `?uin=`
- `GET /session/read-list` — список сессий аккаунта с флагом `is_current` (из JWT sessionId)
- `DELETE /session/delete/:id` — кик сессии (404 `session_not_found`, 403 `not_your_session`)
- `POST /session/clear-others` — кик всех остальных сессий → `{ kicked_count }`
- `PATCH /session/update-nickname` — установка/снятие прозвища текущей сессии (204)

### Invites (шаг 4)
- `POST /invite/create` — TTL из `INVITE_TTL_DAYS` env (default 7д), атомарный декремент `invites_remaining`
- `GET /invite/read-list` — активные (не просроченные) инвайты аккаунта
- `DELETE /invite/revoke/:id` — отзыв + инкремент `invites_remaining`
- `GET /invite/read-referrals` — кто пригласил + кого пригласил (один запрос)
- `GET /app/feature-flags` — `free_registration`, `dev_mode` из env (публичный)
- Postman-коллекция: авто-сохранение токенов, `{{access_token}}` / `{{refresh_token}}` / `{{base_url}}`

## In Progress
_Nothing yet._

## Implementation Order

Зависимости между фичами определяют порядок реализации. Внутри группы — параллельно.

```
✅ 1. Backend bootstrap (NestJS init, docker-compose up, Drizzle + полная схема БД)
   │
✅ 2. Accounts + Auth + Sessions (JWT, login/register, refresh, guards)
   │
✅ 3. UIN generation (BullMQ job, GET /uin/read-status)
   │
✅ 4. Invites (feature flags, invite/check, create/revoke/read-list/read-referrals)
   │
✅ 5. Sessions + Account endpoints (read-list, delete, clear-others, update-nickname, account/read)
   │
✅ 6. Recovery (Q/A CRUD, reset flow, rate-limit, WSS password_reset_via_recovery)
   │
   7. WSS gateway (uin_assigned, session_kicked, token rotation без реконнекта)
   │
   8. Frontend: подключение к реальному API (auth flow, platform guard)
   │
   9. Chats + E2E (ECDH key exchange, WSS messaging)
   │
  10. Settings, search, profile, devices UI, push notifications
```

## Up Next

### Лендинг + заглушка (веб) — оставшееся
- Запрос ссылок у бэка `GET /api/v1/app/downloads` при инициализации (только если `platform.isWeb`)

### Идентификация / аккаунты
См. [`docs/identity.md`](docs/identity.md), [`docs/database.md`](docs/database.md), [`docs/database-schema.md`](docs/database-schema.md).
- Бэк: таблицы `accounts` (с `is_admin boolean default false`) и `uins` (раздельные, 1:1 через `uins.account_id`).
- Бэк: `AdminGuard` для всех `/api/v1/admin/*` эндпоинтов — проверка `accounts.is_admin = true` для аккаунта из текущего токена. Назначение через миграцию или ручной UPDATE.
- Бэк: валидация username регексом `^[a-zA-Z][a-zA-Z0-9]{2,29}$` (первый символ — буква, иначе путаница с UIN при логине/поиске).
- Бэк: столбец `uins.is_premium` (boolean) — флаг «красивости». При удалении аккаунта премиум-UIN отвязывается (account_id = NULL), обычный — удаляется (логика в use-case удаления, не FK).
- Бэк: универсальный формат ID (`uuid-v7 + "_" + 13-char unixtime ms`) во всех таблицах + `created_at` / `updated_at` (`timestamptz`) где имеет смысл. Утилита `generateId()`.
- Бэк: задача-генератор UIN (рандом, авторасширение длины 4→10, unique-индекс + retry на коллизии).
- Бэк: скрипт резервирования "красивых" UIN (`1111`, `2222`, `12345`, повторы/лесенки) со `account_id = NULL` и `is_premium = true`. Список паттернов — отдельный подпункт.
- Бэк: эндпоинт статуса готовности UIN (поллинг или WSS push).
- Бэк: use-case удаления аккаунта в транзакции (см. [`docs/database-schema.md`](docs/database-schema.md#удаление-аккаунта)) + WSS `session_kicked` всем активным сессиям.
- Фронт: регистрация → сразу авторизация (до готовности UIN).
- Фронт: модалка/баннер "не выходите, пока UIN не выдан".
- Фронт: мульти-аккаунт — несколько Account залогинено одновременно, переключение в UI.
- Фронт: глобальный поиск по `username` и `uin`, открытие профиля из результатов.

### Инвайты и регистрация
См. [`docs/invites.md`](docs/invites.md).
- Бэк: таблица `invites` (код, TTL, создатель), таблица `referrals` (кто кого пригласил).
- Бэк: столбец `invites_remaining` в `accounts` (default 3).
- Бэк: API feature flags (devMode, freeRegistration и др.).
- Бэк: генерация 10-значного кода (рандом + unique + retry), проверка TTL при использовании.
- Фронт: экран ввода инвайт-кода перед регистрацией (если `freeRegistration` выключен).
- Фронт: главный экран — две кнопки (Авторизация / Регистрация).
- Фронт: авторизация — логин (UIN или username, бэк разбирает) + пароль.
- Фронт: регистрация — только пароль.
- Фронт: в настройках — создание инвайтов, таблица активных кодов, отзыв, список приглашённых.

### Авторизация и устройства
См. [`docs/auth-devices.md`](docs/auth-devices.md).
- Бэк: таблица `sessions` (id, account_id, system_name, platform (`pgEnum`), nickname, **refresh_token_hash** (SHA-256 hex), created_at, updated_at).
- Бэк: JWT-пара access (15 сек, JWT HS256) + refresh (30 дней, opaque 32 random bytes → base64url). Ротация, TTL через env. Refresh token rotation + reuse detection. WSS-ротация через `token_refresh`/`tokens_updated` (без реконнекта).
- Бэк: rate-limit неудачных login-попыток (Redis-счётчик, эскалация 1ч → 24ч → 7д, см. [`docs/auth-devices.md`](docs/auth-devices.md#rate-limit)).
- Бэк: лимит устройств через env (default 20).
- Бэк: эндпоинты логина, refresh, кика устройства, "выйти на всех кроме текущего".
- Бэк: эндпоинт `PATCH /api/v1/session/update-nickname` — установка/снятие прозвища текущей сессии.
- Бэк: WSS-сигнал кикнутому устройству.
- Фронт: хранение токенов локально, мульти-аккаунт (несколько пар токенов).
- Фронт: настройки → список устройств (nickname ?? system_name, платформа, дата активности, текущее помечено), кнопки кика.
- Фронт: установка/изменение прозвища своего устройства.
- Фронт: локальные прозвища чужих устройств (SQLite).

### Админ и приватность (MVP, не "потом-потом")
- Админ-панель: выдача `username` доверенным аккаунтам (через UI / БД).
- Настройки приватности: кто может писать пользователю (публично / только инвайт / закрыто и т.п.). Конкретный набор режимов — подпункт при реализации.

### Recovery (восстановление пароля)
См. [`docs/recovery.md`](docs/recovery.md).
- Бэк: таблица `recovery_questions` (account_id, question, answer_hash).
- Бэк: API создания/редактирования/удаления Q/A пар.
- Бэк: эндпоинт `GET /api/v1/recovery/preset-questions` — готовый список вопросов от сервера.
- Бэк: API запроса списка вопросов аккаунта (без хешей) + проверка ответа + выдача `reset_token`.
- Бэк: API сброса пароля по `reset_token`.
- Бэк: rate-limit неудачных попыток (per-account, эскалация 1ч → 24ч → 7д).
- Бэк: WSS-сигнал `password_reset_via_recovery` всем сессиям аккаунта.
- Фронт: настройки → раздел «Восстановление доступа», список Q/A, добавление preset/своих.
- Фронт: обязательное предупреждение «recovery вернёт аккаунт, не чаты» — без принятия кнопка «Сохранить» неактивна.
- Фронт: экран «Забыли пароль?» — UIN/username → выбор вопроса → ответ → новый пароль.
- Фронт: баннер при сбросе пароля через recovery (если уже залогинен на этом устройстве).

### Мульти-девайс UX
См. [`docs/devices-and-chats.md`](docs/devices-and-chats.md).
- Бэк: эндпоинт `GET /api/v1/chat/read-orphan-peers` — список `account_id` собеседников из чужих сессий моего же аккаунта.
- Бэк: send-эндпоинт сообщений возвращает `404 chat_not_found` если чат удалён каскадом (см. [`docs/devices-and-chats.md`](docs/devices-and-chats.md#мёртвые-чаты-на-устройстве-собеседника)).
- Фронт: экран «Welcome» при первом логине новой сессии — список осиротевших собеседников + кнопка «понял, больше не показывать».
- Фронт: onboarding-модалка при создании первого чата на каждом устройстве (флаг в локальном key-value).
- Фронт: локальная пометка мёртвых чатов (`chats.is_dead`) — детект через `404 chat_not_found` при отправке + сравнение списка чатов на sync. UX: затемнённый чат, disabled input, кнопка «Удалить локально».

## Decisions deferred
- **Список паттернов "красивых" UIN** для стартового резервирования.

## Decisions fixed (recent)
- **Database schema** — DDL-канон в [`docs/database-schema.md`](docs/database-schema.md). PostgreSQL: `text` для ID, `timestamptz` везде, `citext` для username, `pgEnum` для platform/chat_status, `bytea` для зашифрованных blob'ов, schema `public`. Cascade-правила фиксированы по сущностям. SHA-256 хеш для refresh-токенов.
- **Backend stack** — NestJS + PostgreSQL 16 + Drizzle + Redis (BullMQ + опц. SessionStore). См. [`docs/backend-stack.md`](docs/backend-stack.md).
- **Очередь UIN-задач** — BullMQ на Redis. См. [`docs/backend-stack.md`](docs/backend-stack.md).
- **Хранение сессий** — абстракция `SessionStore`, реализации Postgres/Redis, выбор через `SESSION_STORE` env. См. [`docs/backend-stack.md`](docs/backend-stack.md).
- **Структура репо** — `application-with-frontend/` + `backend/` на одном уровне, два независимых `package.json`. См. [`PROJECT.md`](PROJECT.md).
- **Хеширование пароля** — на сервере, argon2id. Plain-text по TLS. См. [`docs/identity.md`](docs/identity.md), [`docs/recovery.md`](docs/recovery.md).
- **Мастер-ключ устройства** — случайный (Signal-style), в keychain, не зависит от пароля. См. [`docs/local-storage.md`](docs/local-storage.md).
- **Recovery аккаунта** — через секретные Q/A (микс preset + свои, без лимита, OR-логика, argon2id хеш ответов). Recovery возвращает аккаунт, не чаты. Без Q/A восстановление невозможно. См. [`docs/recovery.md`](docs/recovery.md).
- **Мульти-девайс UX** — чаты per-device, без авто-синхронизации. На новом устройстве показываем список «осиротевших собеседников». При первом чате на устройстве — onboarding-модалка. См. [`docs/devices-and-chats.md`](docs/devices-and-chats.md).
- **API контракты MVP** — REST `/api/v1/` (resource/action нейминг) + WSS `wss://normisy.app/ws` (auth первым сообщением). См. [`docs/api-contracts.md`](docs/api-contracts.md).

## Infrastructure TODO
- **Бэк-API `GET /api/v1/app/downloads`** — возвращает `{ ios, android, windows, macos, linux: string }`. Источник ссылок (env vars / БД / GitHub Releases) — на усмотрение бэка.
- **Universal Links / App Links** — `apple-app-site-association` (iOS) и `assetlinks.json` (Android) кладутся на бэк по фиксированным путям. Чтобы инвайт-ссылка `https://normisy.app/invite/...` открывалась в установленной приле.
- **Хостинг фронта** — Docker рядом с бэком на vds/vps (CI/CD позже) либо ручной деплой `dist/` на старте.
- **CORS на бэке** — белый список `Origin` для фронта (`https://normisy.app`, dev-host). Bearer-header API → CSRF не релевантен, но CORS нужен для веб-лендинга (`GET /api/v1/app/downloads`, `/feature-flags`).
- **Логирование** — структурированные JSON-логи (Pino/nestjs-pino). Уровни: `error`, `warn`, `info`, `debug`. Чувствительные поля (passwords, refresh-токены, encrypted_blob) — никогда. Retention TBD при выборе хостинга.
- **Мониторинг** — Sentry для error tracking. Метрики (request rate, latency, queue depth) — Prometheus/Grafana или managed-аналог. На старте можно отложить — но Sentry подключаем сразу.
- **PostgreSQL backup-стратегия** — автоматизированный snapshot + WAL archiving (или managed PG с встроенным backup). Тестировать восстановление до prod-релиза.

### Push-уведомления (часть будущей фичи)
См. [`docs/push-notifications.md`](docs/push-notifications.md).
- Бэк: добавить колонки `sessions.push_token` и `sessions.push_provider` (`pgEnum('apns','fcm','unifiedpush')`) когда дойдём до пушей.
- Бэк: эндпоинт `POST /api/v1/push/register-token`.
- Бэк: APNs / FCM отправка только `chat_id` в payload.

## Backlog
_Идеи и не-приоритетные фичи._

- **i18n** — `@ngx-translate/core` или альтернатива. На старте только русский. Английский добавить когда понадобится для App Store reviewer'ов / зарубежной аудитории.
- **UnifiedPush для Android** — опциональный приёмник push-уведомлений для degoogled-устройств. Юзер выбирает в настройках. Дополнение к FCM (стандарт по умолчанию).

## Потом-потом (post-MVP)
_Фичи, которые осознанно отложены далеко за пределы MVP. Не идеи, а решённое "сделаем когда дозреет"._

- **Покупка дополнительных инвайтов** — внутренний маркетплейс.
- **Веб-портал управления аккаунтом** (`account.normisy.app`) — отдельная мини-прила: посмотреть устройства, кикнуть, удалить аккаунт, без мессенджера. Только когда реально понадобится — например, если массово начнут терять телефоны без других своих устройств.
- **Блог как отдельный проект** — гайды по приватности/анонимности/обходу блокировок. Своё репо, свой домен, своя веб-версия (раз для миссии важно быть доступным без установки прилы). См. протокол §17.
- **SEO для лендинга** — prerender корневого пути в вебе через `@angular-devkit/build-angular:prerender`. В native bundle лендинг есть, но не показывается. Полезно если решим, что хотим находиться в Google по запросу "Нормисы скачать".
- **Apple Watch app** — отдельное WatchKit-приложение. Не Capacitor, своя архитектура. iPad и Mac работают из общего iOS-бандла, Watch — нет.
- **Миграция чатов между своими устройствами** — перенос (не копия) выбранных вручную чатов с одного моего устройства на другое. Условия:
  - Только когда оба устройства онлайн одновременно (если старое потеряно/сломано — миграция невозможна).
  - Юзер выбирает чаты руками (не автомиграция при добавлении устройства).
  - Мигрирует история целиком + ключи.
  - Старое устройство не кикается, но эти чаты с него исчезают.
  - Собеседник не замечает (его публичный ключ не меняется).
  - Механика: новое устройство генерирует временную пару ключей → старое шифрует ею ключи + историю → передаёт через сервер → новое расшифровывает → сервер обновляет `session_id` в `chats`.
- **DPI-обход** (самый последний кейс) — маскировка TLS-фингерпринта на уровне приложения по аналогии с GoodbyeDPI/Zapret. Все детали (платформы, опционально/автоматом, своя реализация vs совместимость с системным VPN/Tor) — решаем когда дойдёт. iOS почти нереально без Apple entitlement.
- **SSH-зеркалирование сервера через Electron** (наименьший приоритет) — по аналогии с Amnezia VPN: встроить SSH-клиент в десктопную версию, юзер вводит данные своего VDS, Electron разворачивает агент зеркалирования через Docker. Credentials только локально. Актуально только если будет одиночный сервер и понадобится децентрализация.
