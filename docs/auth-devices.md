# Авторизация и устройства

## Токены

JWT access + opaque refresh.

| Токен | TTL | Формат | Где конфигурируется |
|---|---|---|---|
| access | `JWT_ACCESS_TTL` env (default `15s`) | JWT HS256, payload `{ sub, sessionId, platform, isAdmin }` | `JwtModule.registerAsync` в `auth.module.ts` |
| refresh | без server-side expiration | 32 случайных байта, base64url (~43 символа) | Генерация: `generateRefreshToken()` в `common/utils/crypto.util.ts` |

**Секреты:**
- `JWT_ACCESS_SECRET` — обязательный (`getOrThrow`), HS256 подпись. Генерация: `openssl rand -base64 32`.

**Хранение на сервере:** только SHA-256 хеш refresh-токена (`sessions.refresh_token_hash`, hex, 64 символа). Plain-text живёт только у клиента. Утечка БД ≠ угон сессий, SHA-256 (не argon2 — это не пароль) даёт O(1)-сравнение при ротации.

**Refresh expiration:** в текущей реализации refresh **не имеет TTL на сервере** — он действителен пока существует сессия и пока его не ротировали (не использовали). Сессия пропадает только при явном кике / `account/logout` / `clear-others` / удалении аккаунта / reuse detection. `JWT_REFRESH_TTL=30d` объявлен в `.env.example` как задел, но в коде сейчас не проверяется.

## Ротация токенов

Два контекста:

- **HTTP:** `POST /api/v1/session/refresh` с `refresh_token` в body → новая пара (access + refresh). Используется при старте прилы, когда WSS ещё не открыт.
- **WSS:** клиент за 3 секунды до истечения access шлёт `{ event: "token_refresh", data: { refresh_token } }`. Сервер отвечает `{ event: "tokens_updated", data: { access_token, refresh_token } }`. Коннект не рвётся.

Оба пути идут через одну логику в `session.repository.rotateRefreshToken(oldHash, newHash)`: атомарный `UPDATE sessions SET refresh_token_hash = newHash WHERE refresh_token_hash = oldHash RETURNING *`. Подробнее: [`api-contracts.md`](api-contracts.md#wss).

**Refresh token rotation:** каждый успешный refresh инвалидирует старый хеш и сохраняет новый. Старый refresh-токен после этого работать не будет — его хеш в БД больше не лежит.

**Reuse detection:** если пришёл refresh, чей хеш не найден в `sessions.refresh_token_hash` — это либо уже использованный, либо подделанный токен. Возвращается:
- HTTP: `401 refresh_reused`
- WSS: `{ event: "error", data: { code: "refresh_reused" } }`

Клиент по `refresh_reused` обязан очистить токены и вернуться на экран авторизации. Серверной авто-инвалидации сессии при reuse сейчас нет — токен «обновили» легитимный пользователь и атакующий, и после первой удачной ротации второй пытается ротировать старый хеш → промах → `401 refresh_reused`. Сама сессия остаётся живой у того, кто успел ротировать первым.

## Лимит устройств

`DEVICE_LIMIT` env, default **20**. Проверка перед созданием сессии в `auth-account.use-case.ts`: если `sessionCount >= deviceLimit` → `403 device_limit_reached`.

## Таблица sessions

Одна таблица — и сессия, и устройство. Полное DDL — в [`database-schema.md`](database-schema.md#sessions).

| Поле | Тип | Заметки |
|---|---|---|
| `id` | `text` PK | Универсальный ID |
| `account_id` | `text` FK | → `accounts.id`, `ON DELETE CASCADE` |
| `system_name` | `text` | Системное имя устройства (`iPhone 14 Pro`, `MacBook Air`). Берётся из `DeviceInfoService` на клиенте |
| `platform` | `pgEnum('platform')` | `ios` / `android` / `electron` |
| `nickname` | `text` nullable | Прозвище устройства, установленное владельцем. Приоритет над `system_name` при показе другим |
| `refresh_token_hash` | `text` | SHA-256 хеш текущего refresh-токена |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Обновляется при ротации токенов (`rotateRefreshToken`) и при `updateNickname` |

## Нейминг устройств

Три слоя:

| Что | Где хранится | Кто видит |
|---|---|---|
| Системное имя (`system_name`) | Сервер, `sessions` | Все (fallback если нет прозвища) |
| Прозвище своего устройства (`nickname`) | Сервер, `sessions` | Все (приоритет над `system_name`) |
| Прозвище чужого устройства | Только локально SQLite | Только я (когда дойдём до шага 9, см. [`local-storage.md`](local-storage.md)) |

**Отображение для других юзеров:** `nickname ?? system_name`.

Установка/снятие nickname — `PATCH /api/v1/session/update-nickname` (тело `{ nickname: string | null }`).

## Кик устройства

Эндпоинты, удаляющие сессии:
- `DELETE /api/v1/session/delete/:id` — кик одной сессии (своей или другой в рамках аккаунта).
- `POST /api/v1/session/clear-others` — кик всех остальных сессий аккаунта.
- `POST /api/v1/account/logout` — удалить текущую сессию.
- `DELETE /api/v1/account/delete` — удалить аккаунт со всеми сессиями.

Уведомление кикнутого устройства — WSS `session_kicked` (см. [`api-contracts.md`](api-contracts.md#session_kicked)). Если онлайн — баннер + редирект на welcome. Если офлайн — при следующем подключении его refresh не найдётся в БД → `401 refresh_reused` → клиент очищает токены сам.

## Rate-limit на логин

Защита от brute-force пароля. Реализация — Redis-счётчик в `auth-account.use-case.ts`.

```
key = auth:fail:{login.lowercase()}
INCR key
EXPIRE key AUTH_FAIL_WINDOW_SEC   # при первом инкременте
```

**Параметры (env):**
- `AUTH_FAIL_LIMIT` (default **5**) — порог.
- `AUTH_FAIL_WINDOW_SEC` (default **900** секунд = 15 минут) — окно.

**Что инкрементирует счётчик:** любая неудача — и неверный пароль, и несуществующий логин. Это сознательный компромисс: иначе атакующий может зондировать UIN-пространство без последствий. Юзер видит одинаковый `401 invalid_credentials` в обоих случаях.

**Сброс счётчика:** при успешном логине удаляются ключи `auth:fail:*` и попутно `recovery_fail_count:*` / `recovery_fail_level:*` (полный сброс защитных счётчиков аккаунта).

**Эскалации блокировок (1ч / 24ч / 7д) у логина нет** — она реализована только для recovery (см. [`recovery.md`](recovery.md)). Здесь — фиксированное окно.

**Ответ при превышении:** `423 login_rate_limited` с полем `retry_after` (ISO-8601 timestamp когда блок снимется).

## Login flow

1. Юзер вводит логин (UIN или username) + пароль. Бэк определяет тип по формату: `/^\d+$/` → UIN, иначе username.
2. Клиент шлёт `POST /api/v1/account/auth` с `{ login, password, system_name, platform }`. `system_name` — из `DeviceInfoService`, `platform` — из `detectPlatform()` ([`platform-services.md`](platform-services.md)).
3. Бэк:
   - Проверяет rate-limit по ключу `auth:fail:{login}`.
   - Ищет аккаунт по UIN/username.
   - Сверяет пароль (argon2id).
   - Проверяет `DEVICE_LIMIT`.
   - Сбрасывает счётчики (auth + recovery).
   - Создаёт `sessions`-запись с новым `refresh_token_hash`.
   - Подписывает JWT с `{ sub: accountId, sessionId, platform, isAdmin }`.
   - Шлёт WSS `session_created` всем подключённым сессиям аккаунта (включая новую, если она уже успела открыть сокет).
4. Возвращает аккаунт + сессию (access + refresh).
5. Клиент сохраняет токены через `TokenStorageService` (Electron — OS keychain, см. [`platform-services.md`](platform-services.md)).

## Безопасность других сессий

При определённых событиях все сессии аккаунта (кроме инициатора) получают WSS-уведомление — фронт показывает security-баннер:

| Событие | WSS-событие | Кому шлётся |
|---|---|---|
| Логин с нового устройства | `session_created` | Всем (включая инициатора, но новая сессия его сама себе показывать не должна — фильтрация на клиенте по `session_id`) |
| Смена пароля через `account/update` | `password_changed` | Всем кроме инициатора (`sendToAccountExcept`) |
| Сброс пароля через recovery | `password_reset_via_recovery` | Всем сессиям аккаунта (`sendToAccount`) |

Сессии при `password_changed` / `password_reset_via_recovery` **не кикаются** — мастер-ключ устройства не зависит от пароля (см. [`recovery.md`](recovery.md), [`local-storage.md`](local-storage.md)).
