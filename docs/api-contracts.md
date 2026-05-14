# API контракты

Реальные HTTP-эндпоинты и WSS-события бэка. Стиль — resource/action.

## Содержание

1. [Общие принципы](#общие-принципы)
2. [HTTP — App](#http--app)
3. [HTTP — Account](#http--account)
4. [HTTP — Session](#http--session)
5. [HTTP — UIN](#http--uin)
6. [HTTP — Invites](#http--invites)
7. [HTTP — Recovery](#http--recovery)
8. [HTTP — Search](#http--search)
9. [HTTP — Chat](#http--chat)
10. [WSS](#wss)

---

## Общие принципы

### База
- HTTP: `https://normisy.app/api/v1/...` — версионирование явное.
- WSS: `wss://normisy.app/ws?token=<access_token>` — один глобальный endpoint, авторизация query-параметром.

### Авторизация
- HTTP: `Authorization: Bearer {access_token}`. Access TTL = `JWT_ACCESS_TTL` (default 15 секунд).
- Refresh — через `POST /api/v1/session/refresh` (тело: `refresh_token`).
- Публичные (без Bearer): `account/create`, `account/auth`, `session/refresh`, `invite/check`, `recovery/preset-questions`, `recovery/read-questions-for-login`, `recovery/check-answer`, `recovery/reset-password`, `app/feature-flags`.

### Формат ошибок
Стиль NestJS `HttpException` + поле `code`:

```
HTTP 4xx/5xx
{
  "statusCode": 401,
  "code": "invalid_credentials",
  "message": "UIN или пароль не совпадают"
}
```

`code` — машинно-читаемый, фронт по нему мапит UI-состояния. `message` — для дев-тулзов и логов.

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
| 409 | Конфликт (username занят) |
| 410 | Gone (инвайт-код просрочен) |
| 423 | Аккаунт залочен (recovery rate-limit) |
| 429 | Too many requests |
| 500 | Внутренняя ошибка |

### Конвенции тел
- ID — строка `{uuid-v7}_{unixtime-ms-13}` (см. [`database.md`](database.md)).
- Timestamps — ISO-8601 (`"2026-04-17T13:45:01.123Z"`). На бэке — `timestamptz` в UTC.
- Поля JSON — snake_case. Внутри NestJS — camelCase, маппинг в DTO.

### Derived-поля в response

Поля, которые не хранятся в БД и формируются на бэке:

| Поле | Источник |
|---|---|
| `account.uin` (string) | JOIN с `uins`, отдаётся `uins.number`. `null` если ещё не сгенерирован |
| `session.is_current` (bool) | Сравнение `session.id` с `sessionId` из текущего JWT |
| `account.is_admin` | `accounts.is_admin`, возвращается только в `account/read` для своего профиля |

---

## HTTP — App

### `GET /api/v1/app/feature-flags`
Feature flags для клиента. Public.

Response 200:
```json
{
  "free_registration": false,
  "dev_mode": false
}
```

Значения читаются из env (`FEATURE_FREE_REGISTRATION`, `FEATURE_DEV_MODE`).

---

## HTTP — Account

### `POST /api/v1/account/create`
Регистрация аккаунта. Public.

Request:
```json
{
  "password": "string (≥8 символов)",
  "invite_code": "string | null",
  "system_name": "iPhone 14 Pro",
  "platform": "ios | android | electron"
}
```

- `invite_code` обязателен при `free_registration === false`. При `free_registration === true` игнорируется.
- Код потребляется атомарно в транзакции: проверяется → удаляется → создаётся аккаунт + сессия. `invite/check` код не резервирует — нужно передавать снова.
- `password` — plain-text по TLS, хешируется argon2id на сервере.
- `system_name` — системное имя устройства от клиента.
- `platform` — одно из: `ios`, `android`, `electron`.

После создания аккаунта в очередь BullMQ ставится job генерации UIN. UIN придёт через WSS (`uin_assigned`) или поллингом `uin/read-status`.

Response 201:
```json
{
  "account": {
    "id": "...",
    "uin": null,
    "username": null,
    "invites_remaining": 3,
    "created_at": "..."
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

Errors:
- 400 `validation_failed`
- 410 `invite_expired`
- 404 `invite_not_found`
- 409 `invite_already_used`

### `POST /api/v1/account/auth`
Авторизация. Логин = UIN (только цифры) или username (буквы). Public.

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

После успешного логина бэк шлёт WSS `session_created` всем уже подключённым сессиям аккаунта.

Errors:
- 401 `invalid_credentials`
- 403 `device_limit_reached`
- 423 `login_rate_limited`

### `POST /api/v1/account/logout`
Выход из текущей сессии. Удаляет запись сессии из БД. Auth required.

Request: пусто.
Response 204.

### `GET /api/v1/account/read`
Чтение профиля. Auth required.

Query (опционально):
- `?id={account_id}` — поиск по ID
- `?uin={uin}` — поиск по UIN
- без параметров — свой профиль

Передавать `id` и `uin` одновременно нельзя.

Response 200 (свой профиль):
```json
{
  "id": "...",
  "uin": "12345" | null,
  "nickname": "string" | null,
  "username": "petya" | null,
  "invites_remaining": 3,
  "is_admin": false,
  "created_at": "..."
}
```

Response 200 (чужой профиль):
```json
{
  "id": "...",
  "uin": "12345" | null,
  "nickname": "string" | null,
  "username": "petya" | null,
  "created_at": "..."
}
```

Errors:
- 400 `ambiguous_query`
- 404 `account_not_found`

### `PATCH /api/v1/account/update`
Смена пароля и/или nickname. Auth required.

Request (минимум одно поле):
```json
{
  "current_password": "string (обязателен если передан new_password)",
  "new_password": "string (≥8 символов, опционально)",
  "nickname": "string | null (опционально; null — снять)"
}
```

Response 204.

При успешной смене пароля всем сессиям аккаунта **кроме текущей** прилетает WSS `password_changed`.

Смена пароля не ломает чаты (мастер-ключ устройства не зависит от пароля, см. [`local-storage.md`](local-storage.md)). Сессии остаются.

Errors:
- 400 `nothing_to_update`
- 400 `current_password_required`
- 401 `invalid_credentials`

### `DELETE /api/v1/account/delete`
Удаление аккаунта. Auth required.

Request: тело пустое.
Response 204.

Что удаляется:
- Все сессии аккаунта (cascade)
- Все инвайты (cascade)
- Все Q/A пары (cascade)
- `referrals` где `invitee_id = account_id` (cascade)

UIN:
- Премиум-UIN (`is_premium = true`) → отвязывается (`account_id = NULL`)
- Обычный UIN → удаляется

Всем активным сессиям перед удалением шлётся WSS `session_kicked`.

---

## HTTP — Session

### `POST /api/v1/session/refresh`
Ротация токенов через HTTP (используется при старте прилы, когда WSS ещё не открыт). Public, валидирует refresh.

Request:
```json
{ "refresh_token": "..." }
```

Response 200:
```json
{ "access_token": "...", "refresh_token": "..." }
```

Старый refresh инвалидируется. **Reuse detection:** повторное использование уже использованного refresh = компрометация сессии; запись из `sessions` удаляется, онлайн-сессии шлётся WSS `session_kicked`.

Errors:
- 401 `refresh_invalid`
- 401 `refresh_expired`
- 401 `refresh_reused`

### `GET /api/v1/session/read-list`
Список сессий аккаунта. Auth required.

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
  }
]
```

### `DELETE /api/v1/session/delete/:id`
Кик сессии. Auth required.

Response 204.

Кикнутой сессии шлётся WSS `session_kicked` (если онлайн).

Errors:
- 404 `session_not_found`
- 403 `not_your_session`

### `POST /api/v1/session/clear-others`
Кик всех сессий аккаунта, кроме текущей. Auth required.

Response 200:
```json
{ "kicked_count": 4 }
```

Каждой кикнутой сессии шлётся WSS `session_kicked`.

### `PATCH /api/v1/session/update-nickname`
Установить/снять nickname текущей сессии. Auth required.

Request:
```json
{ "nickname": "Рабочий мак" | null }
```

Response 204.

### `GET /api/v1/session/read-sessions?account_id=`
Публичные сессии (устройства) любого аккаунта — для выбора устройства при создании чата. Auth required.

Response 200:
```json
[
  {
    "id": "...",
    "system_name": "iPhone 14 Pro",
    "nickname": "Мой айфон" | null,
    "platform": "ios"
  }
]
```

Если аккаунт не найден или у него нет сессий — пустой массив. Не содержит дат и refresh-хешей.

---

## HTTP — UIN

### `GET /api/v1/uin/read-status`
Статус генерации UIN текущего аккаунта (поллинг — альтернатива WSS `uin_assigned`). Auth required.

Response 200:
```json
{ "status": "pending" | "assigned", "uin": "12345" | null }
```

---

## HTTP — Invites

### `POST /api/v1/invite/check`
Проверить код перед регистрацией (для UX — показать экран ввода пароля только если код принят). Public.

Код **не потребляется**: между check и create кто-то другой может использовать тот же код первым. Поэтому `account/create` тоже принимает код и потребляет его атомарно.

Request:
```json
{ "code": "1234567890" }
```

Response 200:
```json
{ "expires_at": "2026-05-17T13:45:01.123Z" }
```

Errors:
- 404 `invite_not_found` — код не существует **или** истёк (намеренно одна ошибка — не даём отличать активные от просроченных при переборе)
- 429 `rate_limited` — превышен порог по IP (10 попыток / 15 минут)

### `POST /api/v1/invite/create`
Создать инвайт-код. Auth required.

Request: тело пустое. TTL = `INVITE_TTL_DAYS` env (default 7 дней).

Response 201:
```json
{
  "id": "...",
  "code": "1234567890",
  "expires_at": "...",
  "created_at": "..."
}
```

`accounts.invites_remaining` декрементируется на 1 атомарно в транзакции.

Errors:
- 403 `no_invites_remaining`

### `GET /api/v1/invite/read-list`
Свои активные инвайты (не использованные, не отозванные, не просроченные). Auth required.

Response 200:
```json
[
  { "id": "...", "code": "1234567890", "expires_at": "...", "created_at": "..." }
]
```

### `DELETE /api/v1/invite/revoke/:id`
Отозвать инвайт. Auth required.

Response 204.

`invites_remaining` инкрементируется на 1.

Errors:
- 404 `invite_not_found`
- 403 `not_your_invite`

### `GET /api/v1/invite/read-referrals`
Реферальная информация: кто пригласил меня + кого пригласил я. Auth required.

Response 200:
```json
{
  "inviter": { "account_id": "...", "uin": "12345", "username": null, "joined_at": "..." } | null,
  "invitees": [
    { "account_id": "...", "uin": "67890", "username": "vasya", "joined_at": "..." }
  ]
}
```

`inviter: null` — зарегистрировался при `free_registration === true` или инвайтер удалил аккаунт.
`uin: null` — UIN ещё не назначен.

---

## HTTP — Recovery

См. [`recovery.md`](recovery.md).

### `GET /api/v1/recovery/preset-questions`
Список пресет-вопросов для UI настройки Q/A. Public.

Response 200:
```json
[
  { "id": "preset_mother_maiden", "text": "Девичья фамилия матери" },
  { "id": "preset_first_pet", "text": "Кличка первого питомца" }
]
```

`id` — для статистики (какие выбирают чаще), в `recovery_questions` хранится сам `text`.

### `POST /api/v1/recovery/question/create`
Добавить Q/A пару. Auth required.

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
Свои Q/A (без хешей). Auth required.

Response 200:
```json
[
  { "id": "...", "question": "...", "created_at": "...", "updated_at": "..." }
]
```

### `PATCH /api/v1/recovery/question/update/:id`
Изменить вопрос и/или ответ. Auth required.

Request:
```json
{ "question": "..." | undefined, "answer": "..." | undefined }
```

Response 204.

### `DELETE /api/v1/recovery/question/delete/:id`
Удалить Q/A пару. Auth required.

Response 204.

### `GET /api/v1/recovery/read-questions-for-login`
Список вопросов аккаунта для экрана «Забыли пароль». Public.

Query: `?login={uin_or_username}`.

Response 200:
```json
{
  "account_id": "...",
  "questions": [
    { "id": "...", "question": "..." }
  ]
}
```

Errors:
- 404 `account_not_found`
- 404 `recovery_not_configured` (аккаунт есть, Q/A нет)
- 423 `recovery_rate_limited`

### `POST /api/v1/recovery/check-answer`
Проверить ответ. При успехе — одноразовый `reset_token` (TTL 10 минут, хранится в Redis). Public.

Request:
```json
{ "account_id": "...", "question_id": "...", "answer": "..." }
```

Response 200:
```json
{ "reset_token": "...", "expires_at": "..." }
```

Errors:
- 401 `wrong_answer` (инкрементирует счётчик неудач)
- 423 `recovery_rate_limited` (эскалация 1ч → 24ч → 7д после 5 неудач)

### `POST /api/v1/recovery/reset-password`
Сменить пароль по `reset_token`. Public.

Request:
```json
{ "reset_token": "...", "new_password": "..." }
```

Response 204.

После сброса всем активным сессиям шлётся WSS `password_reset_via_recovery`. Сессии остаются.

Errors:
- 401 `reset_token_invalid`
- 401 `reset_token_expired`

---

## HTTP — Search

### `GET /api/v1/search`
Глобальный поиск аккаунтов. Auth required.

Query:
- `?q=...` — строка запроса
- `?limit=20` — лимит результатов (default 20)

Response 200:
```json
[
  { "account_id": "...", "uin": "12345", "username": "petya" | null }
]
```

Логика разбора `q` (см. правила логина в [`identity.md`](identity.md)):
- Первый символ — цифра → exact match по `uins.number`
- Первый символ — буква → поиск по `accounts.username` (case-insensitive через CITEXT)

Множества не пересекаются: username не может начинаться с цифры (регекс `^[a-zA-Z][a-zA-Z0-9]{2,29}$`).

---

## HTTP — Chat

### `GET /api/v1/chat/read-orphan-peers`
Аккаунты, с которыми были чаты с других устройств, но нет чатов с текущего. Auth required.

Используется экраном «Новое устройство» — показывает с кем можно возобновить общение.

Response 200:
```json
[
  {
    "account_id": "...",
    "uin": "12345" | null,
    "nickname": "Иван" | null,
    "username": "ivan" | null,
    "last_chat_at": "2025-01-01T00:00:00.000Z"
  }
]
```

Сортировка: `last_chat_at DESC`. Пустой массив если нет осиротевших собеседников.

---

### `GET /api/v1/chat/read-list`
Список чатов текущей сессии с данными собеседника. Auth required.

Response 200:
```json
[
  {
    "id": "...",
    "name": "фильмы",
    "status": "active",
    "created_at": "2025-01-01T00:00:00.000Z",
    "peer": {
      "session_id": "...",
      "system_name": "iPhone 14 Pro",
      "device_nickname": "Мой айфон" | null,
      "account_id": "...",
      "uin": "12345" | null,
      "nickname": "Иван" | null,
      "username": "ivan" | null
    }
  }
]
```

Сортировка: новые чаты первыми (`created_at DESC`). Пустой массив если чатов нет.

---

### `POST /api/v1/chat/create`
Создание чата между текущей сессией и выбранным устройством собеседника. Auth required.

Request:
```json
{
  "name": "фильмы",
  "receiver_session_id": "..."
}
```

Response 201:
```json
{
  "id": "...",
  "name": "фильмы",
  "session_a_id": "...",
  "session_b_id": "...",
  "status": "active",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

`session_a_id` / `session_b_id` — нормализованная пара: `session_a_id < session_b_id` (lexicographic). Порядок определяется сервером, фронт не управляет.

Фаза 1 (plaintext): статус сразу `active`, без обмена ключами. Фаза 2 добавит `pending_key` + `public_key_a/b`.

Errors:
- 404 `session_not_found` — получатель не найден
- 409 `chat_name_taken` — чат с таким именем у этой пары устройств уже есть

---

## WSS

### Подключение

`wss://normisy.app/ws?token=<access_token>`

Access-токен в query при upgrade. Если токена нет или он невалиден — сокет закрывается кодом `4001`.

После установки — двухсторонний канал. Сервер пушит события, клиент может слать команды.

### Формат сообщений

Все сообщения (в обе стороны) — JSON с обязательными полями `event` и `data`:

```json
{ "event": "event_name", "data": { ... } }
```

### Ротация токенов (client → server)

Access TTL короткий (15с по умолчанию), WSS-коннект живёт часами. Клиент обновляет токены без реконнекта.

Клиент декодирует `exp` из JWT и **за 3 секунды до истечения** отправляет:
```json
→ { "event": "token_refresh", "data": { "refresh_token": "..." } }
```

Сервер отвечает новой парой:
```json
← { "event": "tokens_updated", "data": { "access_token": "...", "refresh_token": "..." } }
```

Ошибка (reuse detection):
```json
← { "event": "error", "data": { "code": "refresh_reused" } }
```

При `refresh_reused` клиент должен сам очистить токены и перейти на экран авторизации. Refresh token rotation: каждый `token_refresh` инвалидирует старый refresh и выдаёт новый.

### Heartbeat (client → server)

Клиент периодически шлёт `{ "event": "ping", "data": {} }`. Сервер отвечает `{ "event": "pong", "data": {} }`.

**Background на мобилке:** при переходе прилы в фон iOS/Android приостанавливают JavaScript, клиент не успевает шлёть ping, сервер закрывает коннект. Это нормально. При возврате в foreground клиент устанавливает новое WSS-соединение.

### События (server → client)

#### `session_kicked`
Сессия удалена (кик другой сессией, удаление аккаунта, refresh reuse). Клиент очищает токены и редиректит на welcome.

```json
{ "event": "session_kicked", "data": {} }
```

После события сервер закрывает коннект.

#### `password_reset_via_recovery`
Пароль был сброшен через recovery. Прила показывает баннер «проверь свои устройства». Сессии остаются.

```json
{ "event": "password_reset_via_recovery", "data": { "at": "2026-04-17T..." } }
```

#### `password_changed`
Пароль был изменён через `account/update` на другом устройстве. Шлётся всем сессиям аккаунта **кроме инициатора**. Прила показывает security-баннер.

```json
{ "event": "password_changed", "data": { "at": "2026-04-17T..." } }
```

#### `session_created`
Создана новая сессия (логин с другого устройства). Шлётся всем уже подключённым сессиям аккаунта. Прила показывает security-баннер с кнопками «Кикнуть» / «Устройства» / «Это я».

```json
{
  "event": "session_created",
  "data": {
    "session_id": "...",
    "system_name": "MacBook Air",
    "platform": "electron",
    "at": "..."
  }
}
```

#### `uin_assigned`
UIN сгенерирован для текущего аккаунта. Прила снимает модалку «не выходи пока UIN не пришёл».

```json
{ "event": "uin_assigned", "data": { "uin": "12345" } }
```

Шлётся всем активным сессиям аккаунта.
