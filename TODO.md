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
- `SettingsChangePasswordComponent` (`/application/main/settings/change-password`) — форма (текущий/новый/повтор), show/hide пароля; кнопка «Сменить пароль» в AccountSettings кликабельна
- `SettingsDevicesComponent` — подтверждение кика через `DialogModalComponent` (ModalHeaderIcon.Warning, isConfirmModal), inline-переименование устройства
- `SettingsInvitesComponent` — модалка успеха после createCode() (ModalHeaderIcon.Done с кодом)
- `SessionKickedService` (`main/services/`) — глобальный сервис, открывает bottom-sheet «Сессия завершена», после OK редиректит на `/application/welcome`
- `MainApplicationComponent` — `passwordResetBanner` signal, жёлтый баннер «Пароль был сброшен через восстановление», закрывается крестиком

### Безопасность — уведомления других сессий + WSS bugfix
- **WSS double-connection fix** — `_scheduleReconnect` теперь проверяет `connectionState !== 'disconnected'` перед открытием нового сокета; без этого при reconnect создавалось второе соединение, и `sendToAccount` слал в пустоту пока `_connections` был без записей
- **`SecurityAlertsComponent`** (`core/components/security-alerts/`) — глобальный `position: fixed` оверлей в `RootComponent`; показывает баннеры безопасности на ВСЕХ экранах после авторизации (в т.ч. `main/settings/*` — они не дочерние `MainApplicationComponent`)
- **`password_changed`** WSS-событие — при смене пароля через `PATCH /account/update` все остальные сессии аккаунта получают уведомление (`sendToAccountExcept`); баннер «Пароль изменён на другом устройстве»
- **`session_created`** WSS-событие — при входе с нового устройства все существующие сессии получают уведомление с именем устройства; баннер «Выполнен вход с устройства X» + кнопки «Кикнуть» / «Устройства» / «Это я»
- **`WssConnectionStore.sendToAccountExcept()`** — новый метод, исключает сессию-инициатора из рассылки
- **Push TODO** в `docs/push-notifications.md` — зафиксированы три типа push-уведомлений безопасности (password_reset, password_changed, session_created) для APNs/FCM; TODO-комментарии в use-cases

### Удаление аккаунта + полировка устройств
- **`DELETE /account/delete`** — бэкенд (транзакция: premium UIN → SET NULL, обычный → DELETE, аккаунт → DELETE, WSS `session_kicked` всем сессиям) + фронт (диалог подтверждения → вызов API → очистка токенов → redirect на welcome) + Postman
- **Кик всех других сессий** — кнопка «Завершить все остальные сессии» на экране устройств (`POST /session/clear-others`), `hasOtherDevices` computed signal, диалог подтверждения
- **`dist-electron/` gitignore fix** — добавлен в `.gitignore`, файлы удалены из git tracking

### Полировка фронта — перевод с моков на реальный API (финал шага 8)
- **guestGuard** — защищает `welcome` и `auth/*` от авторизованных пользователей; fix session-restore bug (после рестарта app показывался welcome)
- **`accounts.nickname`** — столбец в БД, `PATCH /account/update` (бэк + фронт); отображение приоритетом: nickname > @username > UIN XXXXX
- **`ProfileApplicationComponent`** — `GET /account/read` (UIN, nickname, username); инициалы из слов nickname
- **`SettingsAccountComponent`** — `GET /account/read` + редактирование nickname inline → `PATCH /account/update`
- **`SettingsChangePasswordComponent`** — реальный `PATCH /account/update`; ошибка 401 → «Неверный текущий пароль»
- **`SettingsRecoveryQuestionsComponent`** — полный CRUD через API (`forkJoin` preset + list; create/update/delete)
- **`SearchApplicationComponent`** — `GET /search` с debounce 300ms через Subject; `SearchApiService` + `avatarColorForId()`
- **`UserProfileApplicationComponent`** — `GET /account/read?id=`; `buildDisplay()` с приоритетом nickname > @username > UIN
- **`RecoveryApplicationComponent`** — все 3 шага подключены к реальному API: `GET /recovery/read-questions-for-login` → `POST /recovery/check-answer` → `POST /recovery/reset-password`; ошибки (wrong_answer, rate_limited, account_not_found, recovery_not_configured)
- **Мок-кнопки dev-событий** — удалены из `ProfileApplicationComponent` (WSS-флоу session_kicked и password_reset_via_recovery полностью проводны в WssService)

### ESLint (оба проекта)
- `switch-exhaustiveness-check` — все кейсы discriminated union обязаны быть покрыты (поймал непокрытый `AppPlatform.WEB`)
- `no-shadow` — запрет перекрытия переменных внешней области видимости
- `promise-function-async` (`checkMethodDeclarations: false`) — функция, возвращающая Promise, обязана быть async
- `TSEnumMember` в `contexts` у `jsdoc/require-jsdoc` — JSDoc обязателен на каждом члене enum

### Backend bootstrap
- NestJS 11, 4-layer архитектура (presentation / application / domain / persistence / common / config)
- Строгий tsconfig (extra-strict) + ESLint (strict-type-checked + jsdoc) идентичный фронту
- Docker compose: postgres 16, redis 7, pgAdmin 4 (port 8081), RedisInsight (port 5540), backend (комментируется для host-разработки)
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

### WSS-gateway (шаг 7)
- `WssModule` — `@Global()`, экспортирует `WssConnectionStore`
- `WssGateway` — `@WebSocketGateway({ path: '/ws' })`, авторизация JWT из `?token=` при upgrade (закрывает сокет 4001 если невалиден)
- `WssConnectionStore` — Map sessionId → { socket, accountId }, `sendToSession` / `sendToAccount`
- WeakMap для хранения sessionId сокета без monkey-patching интерфейса
- `token_refresh` → `tokens_updated`: WSS-ротация без реконнекта (reuse detection)
- `ping` → `pong`
- `session_kicked`: emitирует DeleteSessionUseCase + ClearOtherSessionsUseCase
- `uin_assigned { uin }`: emitирует UinGenerationProcessor после вставки в БД
- `password_reset_via_recovery { at }`: emitирует ResetPasswordUseCase
- `deleteAllByAccountIdExcept` теперь возвращает `string[]` вместо `number`
- `WsAdapter` подключён в `main.ts`

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

### Frontend: подключение к реальному API — шаг 8 (завершён)
- `API_BASE_URL` InjectionToken (`core/api/api-config.ts`) — default `http://localhost:3000/api/v1`
- `FeatureFlagsService` — `GET /app/feature-flags` через `APP_INITIALIZER`, при ошибке — дефолтные флаги; обновляются при нажатии «Зарегистрироваться» (всегда актуальные)
- `InviteApiService` — `POST /invite/check`, обработка 404/429
- `AuthApiService` — `POST /account/create` + `POST /account/auth`, полные типы ответа (snake_case через `eslint-disable`)
- `WelcomeComponent` — читает `freeRegistration` из `FeatureFlagsService` вместо мока
- `InviteCodeComponent` — вызывает API, показывает ошибки, передаёт code в router state
- `CreateAccountComponent` — вызывает API, сохраняет токены, навигирует в main с `pendingUin: true`
- `LoginApplicationComponent` — `POST /account/auth`, сохраняет токены, навигирует в main; ошибки 401/403/423
- `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` в `app.config.ts`
- `AppPlatform` и `OperatingSystem` enum — JSDoc на каждом члене
- **UIN флоу (реальный API):** `UinApiService.readStatus()` → `GET /uin/read-status`; `UinModalService.showPendingAndWait()` — при «Понятно» проверяет статус, если assigned → полноэкранный `UinAssignedApplicationComponent` с реальным UIN из router state; `preventDialogClose: true` на pending-модалке
- **SecureStorage (OS keychain):** `SecureStorageService` абстракция + Electron-реализация через `safeStorage` IPC (macOS Keychain / Win DPAPI / Linux libsecret — один код); Capacitor — TODO-заглушка
- **TokenStorageService** — persist on `store/clear` в SecureStorage; `loadFromStorage()` в APP_INITIALIZER
- **APP_INITIALIZER на старте:** `loadFromStorage()` → `POST /session/refresh` → свежие токены до рендера компонентов
- **authInterceptor** — Bearer header на все запросы; при 401: refresh → retry; параллельные запросы ставятся в очередь через `BehaviorSubject`
- **InputSharedComponent** — глазик показать/скрыть пароль (SVG, только при `type="password"`)
- **Logout** — `AuthApiService.logout()` (`POST /account/logout`, best-effort), `SettingsApplicationComponent` кнопка «Выйти из аккаунта», `tokenStorage.clear()` + navigate welcome
- **authGuard** (`CanActivateFn`) — защищает `/application/main` и все `main/settings/*`, `main/user/:accountId`; redirect на welcome если нет access-токена
- **WssService** (`core/services/wss/`) — connect/disconnect/reconnect (exponential backoff), ping/pong heartbeat, JWT exp decode без либ, token_refresh таймер за 3с до истечения, dispatch: `uin_assigned` → UinModalService, `session_kicked` → SessionKickedService + clear, `password_reset_via_recovery` → passwordResetAt$ Subject; интеграция: connect после login/create/restore, disconnect при logout; MainComponent подписывается через takeUntilDestroyed
- **docs/api-contracts.md WSS** — приведена в соответствие с реальным бэком: URL-auth `?token=`, формат `{event,data}`, heartbeat CLIENT→SERVER
- **SettingsDevicesComponent** — подключён к реальному API: `SessionApiService.readList/deleteById/updateNickname`; кнопка переименования только для текущей сессии; подтверждение кика через `DialogModalComponent`
- **SettingsInvitesComponent** — подключён к реальному API: `forkJoin(readSelf, readList, readReferrals)` в `ngOnInit`; create/revoke/copy через API; `InviteeItem` с аватарами; форматирование `XXXX-XXXX-XX`

## In Progress

_Нет активных задач._

## Оставшийся мок до шага 9

- **`NewDeviceApplicationComponent`** — список осиротевших собеседников мок; подключить к `GET /chat/read-orphan-peers` в шаге 9
- **Чаты** — `ChatsApplicationComponent`, `ChatDetailApplicationComponent`, `CreateChatModalComponent` — полностью на моках; реализовать в шаге 9 (ECDH + WSS messaging)

## Шаг 9 — Chats (декомпозиция)

### Фаза 0 — Актуализация документации (перед стартом чатов)

_Переключиться на Claude Opus. Переписать все доки по уже реализованному функционалу (шаги 1–8): убрать будущее время, TODO-пометки, планировочные формулировки. Оставить только факты — как оно работает сейчас. Сухо, минимально, с поведениями._

**9.0** — Ревизия и переписывание `docs/` по готовому функционалу ✅ (все 9 подзадач):

- [x] **9.0.1** — `api-contracts.md` — только реальные эндпоинты, реальные форматы, реальные коды ошибок
- [x] **9.0.2** — `auth-devices.md` — JWT-пара, сессии, кик, ротация — как реализовано
- [x] **9.0.3** — `backend-stack.md` — стек, модули, архитектура — как есть
- [x] **9.0.4** — `database-schema.md` — только реальные таблицы и поля (убрать всё что ещё не в БД)
- [x] **9.0.5** — `recovery.md` — Q&A флоу, rate-limit, reset_token — как реализовано
- [x] **9.0.6** — `identity.md` — UIN, username, логин — как есть
- [x] **9.0.7** — `invites.md` — инвайты, referrals, feature flags — как реализовано
- [x] **9.0.8** — `platform-services.md` — DI-сервисы, платформенные реализации — как есть
- [x] **9.0.9** — `frontend-architecture.md` — структура, конвенции — как есть

Не трогать: `encryption.md`, `local-storage.md`, `devices-and-chats.md`, `push-notifications.md` — ещё референс для шага 9.

### Фаза 1 — Чаты без шифрования (plaintext байты в encrypted_blob)

_Перед стартом фазы 1 — **переключиться обратно на Claude Sonnet** (Opus используется только для ревизии доков в 9.0)._

**Бэкенд:**
- [x] **9.1** — Drizzle-схема: таблицы `chats` + `pending_messages`, `db:push`, обновить `database-schema.md`
- [x] **9.2** — `GET /session/read-sessions?accountId=` — список сессий чужого аккаунта (для модалки выбора устройства)
- [x] **9.3** — `POST /chat/create` — создание чата (статус `active`, уникальность имени case-insensitive, CHECK session_a_id < session_b_id)
- [x] **9.4** — `GET /chat/read-list` — список чатов текущей сессии
- [x] **9.5** — `GET /chat/read-orphan-peers` — accountId'ы собеседников из чатов удалённых сессий моего аккаунта
- [x] **9.6** — WSS `send_message` → сохранить blob, если получатель онлайн — пушит сразу; `message_sent` → подтверждение отправителю с `message_id`
- [x] **9.7** — WSS `message_delivered` от получателя → удалить blob → WSS `message_delivered` отправителю
- [x] **9.8** — WSS sync при подключении — `handleConnection` пушит все `pending_messages` для сессии
- [x] **9.9** — WSS `message_read` от получателя → WSS `message_read` отправителю
- [x] **9.10** — `DELETE /chat/delete/:id` — удаление чата (cascade; WSS `chat_deleted` собеседнику)

**Фронт:**
- [x] **9.11** — SQLite инфраструктура: `better-sqlite3` (Electron) + `@capacitor-community/sqlite` (Capacitor); `LocalDbService`; per-account DB + schema (`chats`, `messages`, `peer_devices`)
- [x] **9.12** — `LocalChatRepository` — CRUD над `chats` и `messages` в локальной SQLite
- [x] **9.13** — `ChatApiService` — HTTP-клиент: create, read-list, read-orphan-peers, delete; `SessionApiService.readSessions()` — публичные сессии чужого аккаунта
- [x] **9.14** — `CreateChatModalComponent` → реальный список сессий через API, `POST /chat/create`, запись в SQLite
- [x] **9.15** — `ChatsApplicationComponent` → загрузка чатов из локальной SQLite вместо моков
- [x] **9.16** — `ChatDetailApplicationComponent` → реальные сообщения из SQLite, отправка через WSS `send_message`
- [x] **9.17** — WSS: обработка `message_new` → сохранить в SQLite → отправить `message_delivered`
- [x] **9.18** — WSS: sync при подключении — сервер пушит pending_messages как `message_new`; ChatEventsService подписан раньше wss.connect() — работает автоматически
- [x] **9.19** — WSS: обновление статусов `message_delivered` / `message_read` в SQLite → reactivity в UI; отправка `message_read` при открытии чата
- [x] **9.20** — `NewDeviceApplicationComponent` → `GET /chat/read-orphan-peers` вместо мока
- [x] **9.21** — `is_dead` handling: WSS `chat_deleted` → `is_dead` в SQLite → ChatDetail блокирует ввод, ChatsComponent убирает чат из списка

### Фаза 2 — E2E шифрование (ECDH X25519 + HKDF-SHA256 + AES-256-GCM)

- [ ] **9.22** — Бэкенд: `status` / `public_key_a` / `public_key_b` в схеме `chats`; `PATCH /chat/submit-key`; когда оба ключа есть — обнулить, статус → `active`, WSS `chat_key_ready`
- [ ] **9.23** — Фронт: `chat_keys` таблица в локальной SQLite; мастер-ключ из SecureStorage (keychain)
- [ ] **9.24** — Фронт: `CryptoService` — Web Crypto API: ECDH X25519 генерация пары, HKDF-SHA256, AES-256-GCM encrypt/decrypt
- [ ] **9.25** — Фронт: создание чата → генерировать ECDH пару, загружать публичный ключ, статус `pending_key`; UI pending_key в чатах
- [ ] **9.26** — Фронт: WSS `chat_key_ready` → получить публичный ключ собеседника → AES-ключ → `chat_keys` → зашифровать и отправить все `pending_key` сообщения
- [ ] **9.27** — Фронт: все исходящие шифруем AES-256-GCM перед WSS, входящие расшифровываем перед записью в `messages.content`

### Фаза 3 — Double Ratchet (Forward Secrecy + Break-in Recovery)

_Начинать только после полного тестирования фазы 1 (доставка без шифрования) и фазы 2 (базовый E2E)._

- [ ] **9.28** — Фронт: `CryptoService` — ratchet-шаг: генерация новой ECDH-пары, передача нового `public_key` внутри зашифрованного сообщения (в заголовке, не в тексте), вычисление нового симметричного ключа через HKDF
- [ ] **9.29** — Фронт: `chat_keys` расширить: хранить текущий + предыдущий ключ (для расшифровки сообщений «в пути» при рачете); счётчик сообщений для определения момента рачета (каждые N сообщений)
- [ ] **9.30** — Фронт: `LocalChatRepository` — при получении нового публичного ключа от собеседника → вычислить новый AES-ключ → заменить в `chat_keys` → удалить старый после N сообщений задержки
- [ ] **9.31** — Тесты: симуляция компрометации ключа в середине переписки → убедиться что прошлые сообщения нельзя расшифровать, будущие — можно после рачета

### Фаза 4 — Верификация ключей (Safety Numbers)

_Последний слой защиты: пользователи сравнивают ключи вне нашего канала и убеждаются что MITM не было с самого начала._

- [ ] **9.32** — Фронт: `CryptoService` — вычисление Safety Number: `SHA-256(pubA || pubB)` → первые 20 байт → 5 эмодзи (словарь 256 символов → каждый байт = один эмодзи)
- [ ] **9.33** — Фронт: кнопка «Проверить безопасность чата» в деталях чата → модалка с 5 эмодзи + инструкция «Сравни с собеседником голосом, при встрече или скриншотом в другом мессенджере»
- [ ] **9.34** — Фронт: QR-код в той же модалке — содержит fingerprint чата; кнопка «Сканировать QR собеседника» → если совпало → зелёная галочка «Чат проверен», флаг `is_verified` в локальной SQLite
- [ ] **9.35** — Фронт: в списке чатов и в шапке чата показывать иконку «проверен» (зелёный щит) если `is_verified = true`; рачет-ротации ключей внутри канала `is_verified` НЕ сбрасывают — канал уже доказанно чист, новые ключи путешествуют внутри него; сбрасывать только если чат пересоздан (новый первичный ECDH-обмен) или устройство собеседника сменилось

### После MVP — «Облачные чаты» (опциональная фича, account-to-account)

_Реализовывать только после полного завершения шага 9 (включая Safety Numbers) и стабильного тестирования._

**Назначение:** для повседневного общения («идёшь в кино?») — история доступна на всех устройствах аккаунта, в т.ч. на новых после входа. В отличие от обычных чатов (device-to-device, blob удаляется при доставке) — blob хранится на сервере постоянно.

**Модель шифрования (account-level ECDH):**
- У каждого аккаунта одна ключевая пара (не устройства, а аккаунта). Сервер хранит публичные ключи аккаунтов постоянно.
- Два аккаунта делают ECDH по своим публичным ключам → общий симметричный ключ → шифрование blob на устройстве перед отправкой. Сервер видит только blob, ключа у него нет.
- Новое устройство получает публичный ключ собеседника с сервера и вычисляет тот же симметричный ключ — если имеет приватный ключ своего аккаунта.
- **Нерешённый вопрос (главный для фазы N.1):** как новое устройство получает приватный ключ своего аккаунта? Варианты: деривация из пароля (argon2id → key material, но смена пароля ломает историю), QR-сопряжение между устройствами, передача через сервер в зашифрованном виде. Решать при проектировании.
- Это слабее чем device-to-device E2E (один аккаунт-ключ на всех, рачет невозможен), но сервер без приватного ключа сообщения не читает.

**Условия активации:**
- Обе стороны включили «Облачные чаты» в настройках (feature flag на уровне аккаунта, хранится в БД)
- При включении — предупреждение: «Сообщения хранятся на сервере и доступны на всех ваших устройствах. Защита слабее чем в обычных чатах — рекомендуется использовать обычные чаты для чувствительных переписок.»
- При создании облачного чата — повторное предупреждение с рекомендацией выбрать конкретное устройство

**Создание чата:**
- Если у обоих включено — в `CreateChatModalComponent` появляется выбор: «Чат с устройством» (обычный E2E, рекомендован) или «Облачный чат» (с предупреждением)
- Облачный чат привязан к паре `account_id`, не к сессиям

**Хранение:**
- `cloud_chats` — пара `account_a_id` / `account_b_id` + `public_key_a` / `public_key_b`
- `cloud_messages` — blob хранится постоянно (без auto-delete), с пагинацией при подгрузке истории

**Что продумать перед реализацией:**
- [ ] **N.1** — Решить вопрос синхронизации приватного ключа аккаунта между устройствами (деривация из пароля vs QR vs другое); задокументировать выбор
- [ ] **N.2** — UX: как различать два типа чата в UI (иконка облака?), нейминг финальный
- [ ] **N.3** — Схема `cloud_chats` + `cloud_messages`, пагинация истории, связь с существующей архитектурой
- [ ] **N.4** — Бэкенд: WSS-events (`cloud_message_new`, без auto-delete), `sendToAccount` вместо `sendToSession`
- [ ] **N.5** — Фронт: загрузка истории с сервера при входе на новое устройство, локальный кэш в SQLite

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
✅ 7. WSS gateway (uin_assigned, session_kicked, token rotation без реконнекта)
   │
✅ 8. Frontend: подключение к реальному API (auth flow, platform guard, devices, invites, полировка всех экранов кроме чатов)
   │
   9. Chats + E2E (ECDH key exchange, WSS messaging)
   │
  10. Settings, search, profile, push notifications
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
- ~~Бэк: таблица `invites`, `referrals`, `invites_remaining`, feature flags, генерация кода~~ ✅
- ~~Фронт: экран ввода инвайт-кода (если `freeRegistration` выключен)~~ ✅
- ~~Фронт: главный экран — две кнопки (Авторизация / Регистрация)~~ ✅
- ~~Фронт: регистрация — только пароль, POST /account/create~~ ✅
- ~~Фронт: авторизация — логин (UIN или username, бэк разбирает) + пароль → `POST /account/auth` → токены.~~ ✅
- ~~Фронт: logout → `POST /account/logout`, очистка TokenStorageService.~~ ✅
- ~~Фронт: в настройках — создание инвайтов, таблица активных кодов, отзыв, список приглашённых (подключить к реальному API).~~ ✅

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
- ~~Фронт: настройки → список устройств (nickname ?? system_name, платформа, дата активности, текущее помечено), кнопки кика.~~ ✅
- ~~Фронт: установка/изменение прозвища своего устройства.~~ ✅
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
- **Список паттернов "красивых" UIN** — зафиксирован ниже, реализация в Infrastructure TODO.

## Infrastructure TODO

### Резервирование «красивых» UIN (`docker/sql-files/reserve-premium-uins.sql`)

Скрипт запускается вручную через `psql` когда нужно (dev, staging, prod). **Не добавлять в `docker-entrypoint-initdb.d/`** — только по явному запросу. Вставляет строки в `uins` с `account_id = NULL, is_premium = TRUE`.

**Паттерны (UIN от 4 до 10 цифр):**

| Группа | Примеры | Кол-во |
|---|---|---|
| Все одинаковые цифры | 1111, 2222…9999; 11111…99999; … до 1111111111 | 9 × 7 = 63 |
| Последовательность ↑ | 1234, 12345, 123456, 1234567, 12345678, 123456789, 1234567890 | 7 |
| Последовательность ↓ | 9876, 98765, 987654, 9876543, 98765432, 987654321, 9876543210 | 7 |
| Круглые (X × 10^n) | 1000, 2000…9000; 10000…90000; … до 9000000000 | 9 × 7 = 63 |
| Пары одинаковых | 1122, 2233, 3344, 4455, 5566, 6677, 7788, 8899, 9900 | 9 |
| Зеркало 4-значные | 1001, 1221, 1331, 1441, 1551, 1661, 1771, 1881, 1991, 2002, 2112, 2332 … | ~45 |

Итого ~200 строк — без фанатизма.

**Задача:** написать `docker/sql-files/reserve-premium-uins.sql` с `INSERT INTO uins (id, number, is_premium, account_id, created_at) VALUES ...` для всех паттернов выше. `id` генерировать как `gen_random_uuid() || '_' || extract(epoch from now())::bigint * 1000`.

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

- **Safety Numbers / верификация ключей чата** — актуально для публичных self-hosted инстансов где оператор потенциально враждебен пользователям.
  - **Единственный надёжный способ:** кнопка «Проверить безопасность чата» → модалка с 5 эмодзи (`SHA-256(pubA || pubB)` → первые 20 байт → словарь 256 символов) → инструкция «сравни с собеседником голосом в другом мессенджере или при встрече».
  - **Почему WebRTC не помогает автоматически:** DTLS fingerprint передаётся через SDP (signaling через наш сервер) → атакующий, контролирующий сервер, подменяет fingerprint в SDP → владеет DTLS-сессией, даже если IP-пакеты идут напрямую P2P. Автоматической верификации против серверного MITM не существует — нужен внеполосный канал (голос, встреча).

- **Псевдоним (display name)** — отображаемое имя, пользователь ставит сам. Произвольный текст (кириллица, пробелы, что угодно), не используется для входа и поиска. Отдельное поле `nickname` в таблице `accounts`. Показывается в профиле вместо/рядом с UIN. Отличается от `username` (буквенный логин, назначается админом).

- **i18n** — `@ngx-translate/core` или альтернатива. На старте только русский. Английский добавить когда понадобится для App Store reviewer'ов / зарубежной аудитории.
- **UnifiedPush для Android** — опциональный приёмник push-уведомлений для degoogled-устройств. Юзер выбирает в настройках. Дополнение к FCM (стандарт по умолчанию).

## Потом-потом (post-MVP)
_Фичи, которые осознанно отложены далеко за пределы MVP. Не идеи, а решённое "сделаем когда дозреет"._

> **⚠ Правило для Claude / Sonnet:** ничего из этого раздела **нельзя** затаскивать в MVP по собственной инициативе. Если возникает соблазн (пользователь упомянул, фича всплыла по контексту, кажется что «оно само напрашивается») — обязательное **пятикратное подтверждение** от пользователя:
>
> > «А точно ли это надо в MVP? 1/5»
> > «А точно ли это надо в MVP? 2/5»
> > … и так до 5/5.
>
> Пять «да» подряд — только тогда переносим в активный план. Любое сомнение / уход в сторону / «ну может потом» — остаётся в «потом-потом». Цель: защита от эмоционального скоупа.

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
