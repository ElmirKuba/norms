# Push-уведомления

## Принцип

**Сервер шлёт только `chat_id`** в push-payload. Само содержимое сообщения — расшифровывается на клиенте из локальной SQLite.

Apple/Google видят только: "пришло уведомление в аккаунт X для чата Y". Не видят: текст, отправителя, число сообщений.

## Flow

1. Сервер получает новое сообщение для офлайн-устройства.
2. Шлёт push-провайдеру (APNs/FCM): `{ chat_id }` + tag для тихого пробуждения.
3. Устройство просыпается, прила запускается в фоне.
4. Прила синхронизируется по WSS — получает накопленные `pending_messages` (см. [`server.md`](server.md)).
5. Расшифровывает, сохраняет в локальную SQLite.
6. Формирует **локальную** системную нотификацию: "Иван • Чат про фильмы\nПривет!" — берёт текст из расшифрованной БД.

## Платформы

| Платформа | Механизм | Заметки |
|---|---|---|
| iOS / iPadOS | APNs | Apple Developer Program $99/год. Покрывает iPhone, iPad, Mac. |
| Android (default) | FCM | Стандарт, работает у всех. Google видит факт прихода (но не содержимое) |
| Android (опция) | UnifiedPush | Для degoogled-устройств. Юзер выбирает в настройках. **TODO** — после MVP |
| Windows / macOS / Linux | Electron Notification API | Только когда прила запущена (foreground или tray). Без прилы — без уведомлений |

## iPad

Capacitor собирает универсальный iOS-бандл — работает и на iPhone, и на iPad из коробки. Нужно протестить адаптивность UI. Watch — отдельная история (WatchKit), в "потом-потом".

## Регистрация push-токенов

Push-токен (APNs / FCM) **per-сессия, не per-аккаунт**: токен — характеристика установки прилы на конкретном устройстве. У одного аккаунта на 3 устройствах будет 3 разных токена.

**Хранение:** колонки в таблице `sessions` (добавляются при реализации этой фичи, не в MVP-схеме):

| Поле | Тип | Заметки |
|---|---|---|
| `push_token` | `text` nullable | APNs device token / FCM registration token |
| `push_provider` | `pgEnum('push_provider')` nullable | `apns` / `fcm` / `unifiedpush` |

**API:** `POST /api/v1/push/register-token` (auth required) — клиент отправляет свой токен после получения от системы. Бэк апдейтит `push_token`/`push_provider` для текущей сессии. При смене токена (iOS APNs может менять) клиент шлёт повторно.

**Кик сессии = инвалидация push-токена:** при удалении строки из `sessions` push-токен уходит каскадом. Apple/Google последующие push на этот токен будут возвращать `unregistered`/`invalid` — бэк может игнорировать.

## Сервис

`NotificationService` (см. [`platform-services.md`](platform-services.md)):
- Capacitor: `@capacitor/push-notifications` (приём пушей) + `@capacitor/local-notifications` (локальные нотификации после расшифровки)
- Electron: native Notification API
