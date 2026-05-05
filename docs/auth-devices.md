# Авторизация и устройства

## Токены

JWT-пара: access + refresh.

| Токен | TTL по умолчанию | Формат | Заметки |
|---|---|---|---|
| access | 15 секунд | JWT (HS256), payload: `{ sub: account_id, sid: session_id }` | TTL через env `JWT_ACCESS_TTL`. Подпись через `JWT_ACCESS_SECRET` (≥ 32 байта) |
| refresh | 30 дней | **32 случайных байта**, base64url (~43 символа) | TTL через env `JWT_REFRESH_TTL`. На сервере хранится **SHA-256 хеш**, не plain. Зачем JWT не используется: refresh не требует payload, а opaque-токен дешевле/безопаснее (нечего парсить, нечего ротировать в payload) |

**Длины секретов:**
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — минимум 32 байта (256 бит). Генерируются один раз через `openssl rand -base64 32`, кладутся в env.
- `refresh_token` — `crypto.randomBytes(32)`, отдаётся клиенту как `base64url`.

**Ротация — два контекста:**

- **HTTP:** когда access истёк → `POST /api/v1/session/refresh` с refresh_token в body → новая пара (оба токена). Используется если WSS не открыт.
- **WSS (долгоживущее соединение):** клиент проактивно отправляет `{ type: "token_refresh", refresh_token }` за 3 секунды до истечения access. Сервер отвечает `{ type: "tokens_updated", access_token, refresh_token }`. Соединение не рвётся. Grace period 2 сек если access всё-таки истёк раньше refresh. Подробнее: [`api-contracts.md`](api-contracts.md) → WSS.

**Refresh token rotation:** при каждой ротации старый refresh инвалидируется, выдаётся новый. **Reuse detection:** если пришёл уже использованный refresh — сессия считается компрометированной, устройство кикается.

**Истечение:** если 30 дней не открывали прилу → refresh истёк → сессия удаляется → юзер должен авторизоваться заново.

## Лимит устройств

Конфигурируется через env. По умолчанию **20**. По сути без реального ограничения, но можно поменять.

## Таблица sessions (устройства/сессии)

Одна таблица — и сессия, и устройство. Полное DDL и индексы — в [`database-schema.md`](database-schema.md).

| Поле | Тип | Заметки |
|---|---|---|
| `id` | `text` PK | Универсальный ID |
| `account_id` | `text` FK | → `accounts.id`. `ON DELETE CASCADE` |
| `system_name` | `text` | Системное имя (`iPhone 14 Pro`, `MacBook Air`). Обновляется при каждом подключении |
| `platform` | `pgEnum('platform')` | `ios` / `android` / `electron` |
| `nickname` | `text` nullable | Прозвище устройства, установленное владельцем. Приоритет над `system_name` при показе другим юзерам |
| `refresh_token_hash` | `text` | **SHA-256 хеш** текущего refresh-токена (hex, 64 символа). Plain-text токен хранится только у клиента |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Обновляется при каждой ротации токенов. Заменяет `last_active_at` |

**Почему хеш, а не plain-text refresh:** утечка БД ≠ угон сессий. SHA-256 (не argon2 — это не пароль) даёт O(1)-сравнение при ротации/reuse-detection. Сам токен — случайные 32+ байта, перебирать бессмысленно.

## Хранение сессий

Только в PostgreSQL — таблица `sessions` (см. [`database-schema.md`](database-schema.md#sessions)). Подробнее о причинах отказа от Redis-варианта: [`backend-stack.md`](backend-stack.md#хранение-сессий).

## Нейминг устройств

Три слоя:

| Что | Где хранится | Кто видит |
|---|---|---|
| Системное имя (`system_name`) | Сервер, таблица `sessions` | Все (fallback если нет прозвища) |
| Прозвище своего устройства (`nickname`) | Сервер (таблица `sessions`) + локально SQLite | Все (приоритет над `system_name`) |
| Прозвище чужого устройства | Только локально SQLite | Только я |

**Отображение для других юзеров:** `nickname ?? system_name`.

Системное имя отправляется на сервер при каждом подключении (юзер мог переименовать устройство в системных настройках). Прозвище отправляется при установке/изменении.

## Кик устройства

- **Само-кик** (в настройках: "выйти на всех устройствах кроме текущего" или кик конкретного устройства) — удаляем запись из `sessions`.
- **Админ-кик** — то же самое.
- **Уведомление кикнутого устройства:** если онлайн — WSS-событие `session_kicked` (см. [`api-contracts.md`](api-contracts.md) → WSS), устройство сразу переходит на экран авторизации. Если офлайн — при следующем подключении refresh token не найдётся в таблице → 401 → экран авторизации.

## Установка прозвища

Эндпоинт `PATCH /api/v1/session/update-nickname` (см. [`api-contracts.md`](api-contracts.md)) — установка/снятие `nickname` для текущей сессии. Передача `null` снимает прозвище.

Прозвища чужих устройств (только локально, не на сервер) — через локальный SQLite в таблице `peer_devices.my_local_nickname` (см. [`local-storage.md`](local-storage.md)).

## Rate-limit

**Защита от brute-force на пароль.** Реализация — Redis-счётчик, аналогично recovery (см. [`recovery.md`](recovery.md#защита-от-brute-force)):

```
# Ключ: login_attempts:{account_id}
INCR login_attempts:{account_id}
EXPIRE login_attempts:{account_id} {lock_period_seconds}
```

**Эскалация блокировок:**
- 5 неудач за 5 минут → блок логина на **1 час**.
- 5 неудач после разблокировки → блок на **24 часа**.
- 5 неудач ещё раз → блок на **7 дней**.

**Сброс счётчика:** при успешном логине — `DEL login_attempts:{account_id}`.

**Что считается «неудачей»:** только `401 invalid_credentials` (неверный пароль). Запросы с битым форматом тела или несуществующим логином не инкрементируют счётчик (иначе можно DoS-нуть аккаунт по UIN, угадывая случайные UIN). Если логин не найден — отвечаем `401 invalid_credentials` (тот же код, что и при неверном пароле — не раскрываем существование аккаунта), но счётчик не трогаем.

**API:** при превышении лимита `/api/v1/account/auth` возвращает `423 login_rate_limited` с `retry_after` в response (unixtime ms когда блок снимется).

## Login flow

1. Юзер вводит логин (UIN или username — бэк определяет по формату: только цифры → UIN, иначе username) + пароль.
2. Клиент шлёт `POST /api/v1/account/auth` с `{ login, password, system_name, platform }`. `system_name` берётся из `DeviceInfoService` (см. [`platform-services.md`](platform-services.md)), `platform` — из `detectPlatform()`.
3. Бэк проверяет credentials, создаёт запись в `sessions` (`system_name`, `platform`, `refresh_token`).
4. Возвращает аккаунт + сессию (с парой access + refresh).
5. Клиент сохраняет токены локально (keychain через `StorageService`). Мульти-аккаунт: каждый аккаунт — своя пара токенов, переключение в UI.
