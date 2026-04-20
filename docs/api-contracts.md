# API контракты

HTTP-ручки и WSS-события для бэка. Стиль именования вдохновлён [`nest-backend-example/`](../nest-backend-example/) — resource/action.

Покрывает сейчас только **текущие задачи Up Next в [`TODO.md`](../TODO.md)** (auth, identity, sessions, invites, recovery, мульти-девайс, app/system). Чаты, сообщения, обмен ключами, push — будут добавлены, когда дойдём до них.

## Содержание

1. [Общие принципы](#общие-принципы)
2. [HTTP — System / App](#http--system--app)
3. [HTTP — Account & Auth](#http--account--auth)
4. [HTTP — UIN](#http--uin)
5. [HTTP — Sessions / Devices](#http--sessions--devices)
6. [HTTP — Invites](#http--invites)
7. [HTTP — Recovery](#http--recovery)
8. [HTTP — Search](#http--search)
9. [HTTP — Chats (orphan peers)](#http--chats-orphan-peers)
10. [HTTP — Admin](#http--admin)
11. [WSS](#wss)

---

## Общие принципы

### База
- `https://normisy.app/api/v1/...` — версионирование явное, задел на breaking changes.
- WSS: `wss://normisy.app/ws` — один глобальный endpoint, авторизация первым сообщением.

### Авторизация
- HTTP: `Authorization: Bearer {access_token}`. Access TTL — `JWT_ACCESS_TTL` (default 15s).
- Refresh — отдельным эндпоинтом (`POST /api/v1/session/refresh`), refresh-токен в body.
- Эндпоинты регистрации, авторизации, начала recovery, `app/downloads`, `app/feature-flags`, `app/migrate` — **публичные** (без Bearer).

### Формат ошибок
Используем NestJS `HttpException`-стиль с нормализованным `code`:

```
HTTP 4xx/5xx
{
  "statusCode": 401,
  "code": "invalid_credentials",
  "message": "UIN или пароль не совпадают"
}
```

`code` — машинно-читаемый, фронт по нему мапит UI-состояния. `message` — для дев-тулзов и логов, юзеру не показывается без перевода.

### Status codes
| Code | Когда |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Validation, bad request |
| 401 | Нет токена, токен битый, неправильный пароль |
| 403 | Нет прав (не админ, чужой ресурс) |
| 404 | Нет ресурса |
| 409 | Конфликт (username занят, инвайт уже использован) |
| 410 | Gone (инвайт-код просрочен) |
| 423 | Аккаунт залочен (recovery rate-limit) |
| 429 | Too many requests |
| 500 | Внутренняя ошибка |

### Конвенции тел
- Универсальный ID — строка `{uuid-v7}_{unixtime-ms-13}` (см. [`database.md`](database.md)).
- Timestamps — ISO-8601 строкой (`"2026-04-17T13:45:01.123Z"`) или unixtime ms (`bigint`) — в каждом эндпоинте явно.
- Поля snake_case в JSON. (Внутри NestJS — camelCase, через `class-transformer`.)

---

## HTTP — System / App

### `GET /api/v1/app/downloads`
Ссылки на скачивание прилы. Используется браузерным лендингом.

Public.

Response 200:
```json
{
  "ios": "https://apps.apple.com/...",
  "android": "https://play.google.com/...",
  "windows": "https://normisy.app/dl/normisy-setup.exe",
  "macos": "https://normisy.app/dl/normisy.dmg",
  "linux": "https://normisy.app/dl/normisy.AppImage"
}
```

### `GET /api/v1/app/feature-flags`
Feature flags для нативной прилы. Возвращает только флаги, относящиеся к UI/поведению клиента.

Public.

Response 200:
```json
{
  "free_registration": false,
  "dev_mode": false
}
```

### `GET /api/v1/system/dev/migrate`
Запуск миграций БД (dev-only, в проде эндпоинт отключён через env).

Public (но `dev_mode === true`, иначе 403).

Response 200: `{ "applied": ["0001_init", "0002_invites"] }`

---

## HTTP — Account & Auth

### `POST /api/v1/account/create`
Регистрация аккаунта.

Public.

Request:
```json
{
  "password": "string",
  "invite_code": "string | null"
}
```

- `invite_code` обязателен, если `feature-flags.free_registration === false`.
- `password` — plain-text, hash на сервере argon2id (см. [`recovery.md`](recovery.md#хеширование)).

Response 201:
```json
{
  "account": {
    "id": "...",
    "uin": null,
    "username": null,
    "invites_remaining": 3,
    "created_at": "2026-04-17T..."
  },
  "session": {
    "id": "...",
    "system_name": "...",
    "platform": "ios",
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

Создаётся account → ставится UIN-job в очередь → создаётся первая сессия → возвращаются токены. UIN придёт позже через WSS (`uin_assigned`) или по поллингу.

Errors:
- 400 `validation_failed`
- 410 `invite_expired`
- 404 `invite_not_found`
- 409 `invite_already_used`

### `POST /api/v1/account/auth`
Авторизация. Логин = UIN или username (бэк сам определяет: только цифры → UIN, иначе username).

Public.

Request:
```json
{
  "login": "12345 | petya",
  "password": "string",
  "system_name": "iPhone 14 Pro",
  "platform": "ios"
}
```

Response 200:
```json
{
  "account": { "id": "...", "uin": "...", "username": "...", "invites_remaining": 2 },
  "session": { "id": "...", "access_token": "...", "refresh_token": "..." }
}
```

Errors:
- 401 `invalid_credentials`
- 403 `device_limit_reached` (превышен `DEVICE_LIMIT`)

### `POST /api/v1/account/logout`
Выход из аккаунта на текущем устройстве. Удаляет текущую сессию.

Auth required.

Request: пусто.
Response 204.

### `POST /api/v1/session/refresh`
Ротация токенов (HTTP-вариант). Используется если WSS не открыт (например, при запуске прилы).

Public (но валидируется refresh).

Request:
```json
{ "refresh_token": "..." }
```

Response 200:
```json
{ "access_token": "...", "refresh_token": "..." }
```

Errors:
- 401 `refresh_invalid` (нет такой записи в sessions / refresh испорчен / уже использован — reuse detection)
- 401 `refresh_expired`

При успешной ротации: старый refresh инвалидируется, выдаётся новый, `sessions.updated_at` обновляется.

**Reuse detection:** если refresh уже был использован — сессия считается компрометированной, выдаётся `401 refresh_reused`, устройство кикается (запись из `sessions` удаляется, онлайн-девайсу шлётся WSS `session_kicked`).

### `GET /api/v1/account/read`
Чтение данных аккаунта.

Auth required.

Query: `?id={account_id}` (опционально, без id — свой аккаунт).

Response 200:
```json
{
  "id": "...",
  "uin": "12345" | null,
  "username": "petya" | null,
  "invites_remaining": 3,
  "created_at": "..."
}
```

При чтении чужого аккаунта `invites_remaining` не возвращается.

### `PATCH /api/v1/account/update`
Смена пароля.

Auth required.

Request:
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

Response 204.

Errors:
- 401 `invalid_credentials`

Смена пароля **не ломает чаты** (мастер-ключ не зависит от пароля, см. [`local-storage.md`](local-storage.md)). Сессии остаются.

---

## HTTP — UIN

### `GET /api/v1/uin/read-status`
Статус генерации UIN для текущего аккаунта (для поллинга, если WSS не подключён). Альтернатива: WSS-событие `uin_assigned`.

Auth required.

Response 200:
```json
{ "status": "pending" | "assigned", "uin": "12345" | null }
```

---

## HTTP — Sessions / Devices

### `GET /api/v1/session/read-list`
Все сессии текущего аккаунта.

Auth required.

Response 200:
```json
[
  {
    "id": "...",
    "system_name": "MacBook Air",
    "nickname": "Рабочий мак" | null,
    "platform": "electron",
    "is_current": true,
    "created_at": "...",
    "updated_at": "..."
  },
  ...
]
```

`is_current` — флаг для UI, чтобы не дать кикнуть себя по случайности.

### `DELETE /api/v1/session/delete/:id`
Кик конкретной сессии (своей или чужой в рамках аккаунта).

Auth required.

Response 204.

После удаления — кикнутому устройству шлётся WSS `session_kicked` (если онлайн).

Errors:
- 404 `session_not_found`
- 403 `not_your_session`

### `POST /api/v1/session/clear-others`
Удалить все сессии аккаунта, кроме текущей.

Auth required.

Response 200:
```json
{ "kicked_count": 4 }
```

### `PATCH /api/v1/session/update-nickname`
Установить/изменить nickname своей текущей сессии.

Auth required.

Request:
```json
{ "nickname": "Рабочий мак" | null }
```

`null` — снять прозвище.

Response 204.

---

## HTTP — Invites

### `POST /api/v1/invite/create`
Создать инвайт-код.

Auth required.

Request:
```json
{ "expires_at": 1729012345678 }
```

`expires_at` — unixtime ms. Минимальный TTL — час, максимальный — 30 дней (валидируется бэком).

Response 201:
```json
{
  "id": "...",
  "code": "1234567890",
  "expires_at": 1729012345678,
  "created_at": "..."
}
```

После создания `accounts.invites_remaining` декрементируется на 1.

Errors:
- 403 `no_invites_remaining`

### `GET /api/v1/invite/read-list`
Мои активные (не использованные, не отозванные, не просроченные) инвайт-коды.

Auth required.

Response 200:
```json
[
  { "id": "...", "code": "1234567890", "expires_at": 1729012345678, "created_at": "..." },
  ...
]
```

### `DELETE /api/v1/invite/revoke/:id`
Отозвать инвайт-код.

Auth required.

Response 204.

После отзыва `accounts.invites_remaining` инкрементируется на 1.

Errors:
- 404 `invite_not_found`
- 403 `not_your_invite`

### `GET /api/v1/invite/read-referrals`
Список аккаунтов, которые я пригласил (из `referrals`).

Auth required.

Response 200:
```json
[
  { "account_id": "...", "uin": "...", "username": "..." | null, "joined_at": "..." },
  ...
]
```

### `GET /api/v1/invite/read-inviter`
Кто пригласил меня (одна запись из `referrals` по моему `invitee_id`).

Auth required.

Response 200:
```json
{ "account_id": "...", "uin": "...", "username": "..." | null, "joined_at": "..." } | null
```

`null` — если зарегистрировался при `free_registration === true`.

---

## HTTP — Recovery

См. [`recovery.md`](recovery.md).

### `GET /api/v1/recovery/preset-questions`
Готовый список вопросов от сервера для UI настройки Q/A.

Public.

Response 200:
```json
[
  { "id": "preset_mother_maiden", "text": "Девичья фамилия матери" },
  { "id": "preset_first_pet", "text": "Кличка первого питомца" },
  ...
]
```

`id` — для статистики «какие вопросы выбирают», но в `recovery_questions` хранится сам `text`.

### `POST /api/v1/recovery/question/create`
Добавить Q/A пару.

Auth required.

Request:
```json
{ "question": "Девичья фамилия матери", "answer": "Иванова" }
```

Response 201:
```json
{ "id": "...", "question": "...", "created_at": "..." }
```

Бэк нормализует `answer` (`trim → lowercase → collapse spaces → NFC`) и хеширует argon2id.

### `GET /api/v1/recovery/question/read-list`
Мои Q/A (без хешей ответов).

Auth required.

Response 200:
```json
[
  { "id": "...", "question": "...", "created_at": "...", "updated_at": "..." },
  ...
]
```

### `PATCH /api/v1/recovery/question/update/:id`
Изменить вопрос и/или ответ.

Auth required.

Request:
```json
{ "question": "..." | undefined, "answer": "..." | undefined }
```

Response 204.

### `DELETE /api/v1/recovery/question/delete/:id`
Удалить Q/A пару.

Auth required.

Response 204.

### `GET /api/v1/recovery/read-questions-for-login`
Список вопросов аккаунта для экрана «Забыл пароль» (без ответов и хешей).

Public.

Query: `?login={uin_or_username}`.

Response 200:
```json
{
  "account_id": "...",
  "questions": [
    { "id": "...", "question": "..." },
    ...
  ]
}
```

Errors:
- 404 `account_not_found`
- 404 `recovery_not_configured` (аккаунт есть, Q/A нет)
- 423 `recovery_rate_limited` (слишком много неудачных попыток)

### `POST /api/v1/recovery/check-answer`
Проверить ответ на вопрос. При успехе возвращается одноразовый `reset_token` (TTL 10 минут).

Public.

Request:
```json
{
  "account_id": "...",
  "question_id": "...",
  "answer": "..."
}
```

Response 200:
```json
{ "reset_token": "...", "expires_at": "2026-04-17T13:55:00.000Z" }
```

Errors:
- 401 `wrong_answer` (инкрементирует rate-limit-счётчик)
- 423 `recovery_rate_limited`

### `POST /api/v1/recovery/reset-password`
Сменить пароль по `reset_token`.

Public.

Request:
```json
{ "reset_token": "...", "new_password": "..." }
```

Response 204.

После сброса — всем активным сессиям этого аккаунта прилетает WSS `password_reset_via_recovery`. Сессии **остаются** (см. [`recovery.md`](recovery.md)).

Errors:
- 401 `reset_token_invalid`
- 401 `reset_token_expired`

---

## HTTP — Search

### `GET /api/v1/search`
Глобальный поиск аккаунтов по UIN или username.

Auth required.

Query: `?q=...&limit=20`.

Response 200:
```json
[
  { "account_id": "...", "uin": "12345", "username": "petya" | null },
  ...
]
```

`q` сначала проверяется как UIN (только цифры) → exact match по `uins.number`. Иначе → `pg_trgm` поиск по `accounts.username` (case-insensitive).

---

## HTTP — Chats (orphan peers)

См. [`devices-and-chats.md`](devices-and-chats.md).

### `GET /api/v1/chat/read-orphan-peers`
Список аккаунтов, с которыми были чаты с **других моих сессий**, но нет с текущей. Используется для экрана «Welcome» при первом логине новой сессии.

Auth required.

Response 200:
```json
[
  {
    "account_id": "...",
    "uin": "12345",
    "username": "petya" | null,
    "last_chat_at": "2026-04-10T..."
  },
  ...
]
```

Бэк делает: `SELECT DISTINCT peer_account_id FROM chats WHERE (session_a_id IN my_other_sessions OR session_b_id IN my_other_sessions) AND peer NOT IN (chats from my current session)`.

---

## HTTP — Admin

### `POST /api/v1/admin/account/grant-username`
Выдать username аккаунту (только админ).

Auth required + admin-роль (определение роли — TODO при реализации).

Request:
```json
{ "account_id": "...", "username": "petya" }
```

Response 204.

Errors:
- 403 `not_admin`
- 409 `username_taken`
- 400 `username_invalid` (длина / алфавит)

---

## WSS

### Подключение
`wss://normisy.app/ws`

Без query-параметров. Авторизация — первое сообщение после открытия коннекта (избегаем токены в URL/логах).

```json
→ { "type": "auth", "access_token": "..." }
← { "type": "auth_ok", "session_id": "..." }
```

Если auth не пришёл за 5 секунд или токен битый:
```
← { "type": "auth_failed", "code": "invalid_token" }
[server закрывает коннект]
```

После `auth_ok` — двухсторонний канал. Сервер пушит события, клиент может присылать команды.

### Ротация токенов (client → server)

Access TTL = `JWT_ACCESS_TTL` (default 15s). WSS-соединение живёт часами. Клиент обновляет токены, не разрывая соединение.

**Клиент проактивно отправляет за 3 секунды до истечения access:**
```json
→ { "type": "token_refresh", "refresh_token": "..." }
```

**Сервер отвечает новой парой:**
```json
← { "type": "tokens_updated", "access_token": "...", "refresh_token": "..." }
```

**Ошибка (reuse detection или refresh истёк):**
```json
← { "type": "token_refresh_failed", "code": "refresh_reused" | "refresh_expired" | "refresh_invalid" }
[server закрывает коннект, сессия кикается]
```

**Grace period:** если access истёк раньше, чем клиент успел рефрешнуть — сервер не рвёт соединение сразу, даёт 2 секунды на входящий `token_refresh`. По истечению grace period без рефреша — закрывает.

**Refresh token rotation:** каждый `token_refresh` инвалидирует старый refresh и выдаёт новый. Reuse detection: повторное использование уже использованного refresh = компрометация, сессия кикается.

### Heartbeat
Сервер шлёт `{ "type": "ping" }` каждые 30 сек. Клиент должен ответить `{ "type": "pong" }`. Иначе через 90 сек коннект закрывается.

### События (server → client)

#### `session_kicked`
Сессия удалена (само-кик, кик другой моей сессией, админ-кик). Прила переходит на экран авторизации.

```json
{ "type": "session_kicked", "reason": "self" | "by_other_session" | "by_admin" }
```

После события сервер закрывает коннект.

#### `password_reset_via_recovery`
Пароль был сброшен через recovery. Прила показывает баннер «проверь свои устройства».

```json
{ "type": "password_reset_via_recovery", "at": "2026-04-17T..." }
```

Сессии остаются активными.

#### `uin_assigned`
UIN сгенерирован для текущего аккаунта. Снимаем модалку «не выходи пока UIN не пришёл».

```json
{ "type": "uin_assigned", "uin": "12345" }
```

Шлётся всем активным сессиям этого аккаунта (если у юзера уже несколько сессий до выдачи UIN).

---

## Что добавится позже

Когда дойдём до чатов, сообщений, push:
- `POST /api/v1/chat/create`, `GET /api/v1/chat/read-list`, `DELETE /api/v1/chat/delete/:id`
- `POST /api/v1/chat/exchange-key` — публичный ключ при создании чата (см. [`encryption.md`](encryption.md))
- `POST /api/v1/message/send` (или WSS-команда `send_message`)
- WSS `message_received`, `message_status_update`, `key_exchange_request`, `key_exchange_complete`
- `POST /api/v1/push/register-token` — регистрация APNs/FCM токена (см. [`push-notifications.md`](push-notifications.md))
- Privacy modes ([`privacy.md`](privacy.md) → TODO)