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
- **Мастер-ключ устройства** (которым шифруются приватные ключи чатов) — в системном keychain. Случайный, генерируется при первой установке прилы. **Не деривируется из пароля** — поэтому смена пароля не ломает чаты. Доступ через `BiometricService` (Face ID / Touch ID / fingerprint).
- **Key-value хранилище** (`@capacitor/preferences` / `electron-store`) — для не-чувствительных флагов и индексов:
  - `accounts_index` — JSON `[{ accountId, dbPath, isActive }]`. Переключатель аккаунтов.
  - `onboarding.first_chat_modal_shown` — boolean. После первого чата на этом устройстве не показываем модалку с объяснением per-device модели (см. [`devices-and-chats.md`](devices-and-chats.md)).
  - `onboarding.orphan_peers_dismissed` — boolean. После клика «понял, больше не показывать» welcome-экран осиротевших собеседников не возвращается на этом устройстве.
  - Прочие UI-флаги по мере появления.

### Сиротские keychain-items
iOS/macOS Keychain переживает удаление прилы. SQLite — нет. При первом запуске, если SQLite пуст, а в keychain есть мастер-ключ — удаляем его как сирота, генерируем новый. См. [`recovery.md`](recovery.md).

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
| `is_dead` | boolean, default 0. Помечается true когда серверный чат удалён (собеседник кикнул сессию или удалил аккаунт). См. [`devices-and-chats.md`](devices-and-chats.md#мёртвые-чаты-на-устройстве-собеседника) |
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
