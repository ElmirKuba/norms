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

## Сервис

`NotificationService` (см. [`platform-services.md`](platform-services.md)):
- Capacitor: `@capacitor/push-notifications` (приём пушей) + `@capacitor/local-notifications` (локальные нотификации после расшифровки)
- Electron: native Notification API
