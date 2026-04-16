# Локальное хранилище (SQLite)

## Принцип

На каждом устройстве — своя SQLite база **на каждый залогиненный аккаунт**. Мульти-аккаунт = несколько `.db` файлов рядом.

Расположение:
- Capacitor: `Filesystem.Directory.Data`
- Electron: `app.getPath('userData')`

## Что хранится локально

- Расшифрованная история переписки
- Приватные ключи чатов (зашифрованы мастер-ключом)
- Сообщения в `pending_key` до обмена ключами
- Прозвища чужих устройств (никогда не уходят на сервер)
- Кэш устройств собеседников (для модалки создания чата)

## Что НЕ в SQLite

- **JWT-токены** — в системном keychain через Capacitor secure storage / electron `keytar`. Безопаснее.
- **Мастер-ключ устройства** (которым шифруются приватные ключи чатов) — в системном keychain. Доступ через `BiometricService` (Face ID / Touch ID / fingerprint).
- **Индекс залогиненных аккаунтов** — key-value (`@capacitor/preferences` / `electron-store`). JSON: `[{ accountId, dbPath, isActive }]`. Простой переключатель аккаунтов.

## Структура per-account БД (`account_{accountId}.db`)

ID во всех таблицах — формат `uuid-v7_unixtime-13ms` (см. [`database.md`](database.md)).

### `chats`
| Поле | Заметки |
|---|---|
| `id` | server chat id |
| `name` | название чата |
| `peer_account_id` | с каким аккаунтом |
| `peer_session_id` | с каким устройством собеседника |
| `status` | `pending_key` / `active` |
| `created_at`, `updated_at` | |

`my_session_id` не нужен — это устройство и есть моё.

### `chat_keys`
| Поле | Заметки |
|---|---|
| `id` | |
| `chat_id` | FK → `chats.id` |
| `private_key_encrypted` | зашифрован мастер-ключом из keychain |
| `public_key` | мой публичный |
| `peer_public_key` | полученный с сервера |
| `created_at`, `updated_at` | |

### `messages`
| Поле | Заметки |
|---|---|
| `id` | Локально сгенерированное сообщение (ещё не на сервере) — только `uuid-v7`. После отправки и подтверждения сервером — заменяется на `uuid-v7_unixtime-13ms` (универсальный ID). По наличию суффикса видно: с unixtime → серверное, без → локальное |
| `chat_id` | FK → `chats.id` |
| `direction` | `outgoing` / `incoming` |
| `content` | расшифрованный текст |
| `status` | `failed` / `pending_key` / `sent` / `delivered` / `read` (см. [`message-statuses.md`](message-statuses.md)) |
| `created_at`, `updated_at` | |

### `peer_devices`
Кэш устройств собеседников + локальные прозвища.

| Поле | Заметки |
|---|---|
| `id` | |
| `peer_account_id` | |
| `session_id` | id сессии собеседника |
| `system_name` | с сервера |
| `server_nickname` | прозвище с сервера (если задано владельцем) |
| `platform` | `ios` / `android` / `electron` |
| `my_local_nickname` | моё локальное прозвище (приоритет в UI) |
| `last_seen_at` | |
| `created_at`, `updated_at` | |

## Использование

Через `StorageService` (см. [`platform-services.md`](platform-services.md)):
- Capacitor: `@capacitor-community/sqlite`
- Electron: `better-sqlite3`

Офлайн-чтение всей истории — расшифрованная переписка уже в локальной БД.
