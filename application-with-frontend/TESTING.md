# Тестирование

## Одновременно: Electron + iOS симулятор + Android эмулятор

Один `ng serve` на всех. Три разных аккаунта — можно тестировать чаты между платформами.

### Запуск

Открыть 4 терминала (все из `application-with-frontend/`):

**Terminal 1** — ng serve (общий для всех платформ):
```bash
npm run dev:serve
```

**Terminal 2** — Electron:
```bash
npm run dev:electron:attach
```

**Terminal 3** — iOS симулятор:
```bash
npm run dev:ios:attach
```

**Terminal 4** — Android эмулятор:
```bash
npm run dev:android:attach
```

**После того как Android эмулятор загрузился** — один раз за сессию (в любом терминале):
```bash
npm run dev:android:reverse
```

> Без этого шага API-запросы в Android эмуляторе не достигают бэкенда на маке.
> iOS симулятору это не нужно — он разделяет сеть с маком напрямую.

---

## Тестирование одной платформы

```bash
# Electron (запускает ng serve внутри)
npm run dev:electron

# iOS симулятор (live reload, без Xcode)
npm run dev:ios:live

# Android эмулятор (live reload)
npm run dev:android:live
```

---

## Реальные устройства

```bash
# iOS устройство
npm run dev:ios:attach-real

# Android устройство
npm run dev:android:attach-real
# + после подключения устройства:
npm run dev:android:reverse
```

---

## Бэкенд

Из `backend/`:
```bash
npm run start:dev
```

---

## Продакшн-сборка

```bash
# Electron (macOS)
npm run build:electron:mac

# iOS (открывает Xcode, финальный .ipa там)
npm run build:ios

# Android (открывает Android Studio, APK/AAB там)
npm run build:android
```

---

## Известные нюансы и решения

### Electron: ошибка better-sqlite3 (NODE_MODULE_VERSION mismatch)

**Симптом:** `Error: The module '.../better-sqlite3.node' was compiled against a different Node.js version`

**Причина:** `better-sqlite3` — нативный модуль. Electron использует свою версию Node.js, которая отличается от системной. После `npm install` модуль собирается под системный Node, но нужен под Electron.

**Решение** — один раз после `npm install`:
```bash
npx @electron/rebuild -f -w better-sqlite3
```

---

### Android: экран входа просит инвайт-код, хотя регистрация открытая

**Симптом:** на iOS и Electron регистрация без инвайта, на Android — экран "Код приглашения".

**Причина:** фронт запрашивает `GET /api/v1/app/feature-flags` при нажатии "Зарегистрироваться". Если Android не может достучаться до бэкенда (не запущен `adb reverse`), запрос падает с ошибкой. Фallback — `freeRegistration: false` → показывается экран инвайта.

**Решение:** запустить `npm run dev:android:reverse` после загрузки эмулятора.

---

### Android: `adb devices` показывает `offline`

**Симптом:** эмулятор запущен, но `adb devices` → `emulator-5554  offline`.

**Решение:**
```bash
adb kill-server && adb start-server
```
Подождать 5–10 секунд, повторить `adb devices`. Если всё равно `offline` — перезапустить эмулятор через **Device Manager → ⋮ → Cold Boot Now**.

---

### Android: "Emulator failed to connect within 5 minutes"

**Симптом:** Android Studio показывает ошибку при старте эмулятора.

**Решение:** нажать OK, затем в Device Manager → ⋮ рядом с устройством → **Cold Boot Now**.

---

### Android: `npm run dev:android:attach` висит на "Deploying APK"

**Симптом:** процесс застрял на `⠦ Deploying app-debug.apk to Pixel_8`, Ctrl+C не помогает.

**Причина:** ADB не может связаться с эмулятором (статус `offline`).

**Решение:**
1. Ctrl+C в терминале
2. `adb devices` — проверить что `device`, не `offline`
3. Если `offline` — см. пункт выше
4. Повторить `npm run dev:android:attach`

---

### iOS: белый экран или ошибка "Cannot GET /"

**Симптом:** приложение запустилось, но показывает белый экран или JSON-ошибку.

**Причина A — неправильный порт:** `cap run --live-reload` по умолчанию ищет dev-сервер на порту 3000 (Ionic-default). Порт 3000 занят бэкендом → получаем ответ бэкенда вместо Angular.

**Решение:** скрипты уже содержат `--port=4200`, пересобирать не нужно. Убедиться что `npm run dev:serve` запущен в Terminal 1 до запуска `dev:ios:attach`.

**Причина Б — ng serve ещё не запустился:** `dev:ios:attach` стартует быстро, но Angular может ещё компилироваться.

**Решение:** дождаться в Terminal 1 строки `Application bundle generation complete` перед запуском Terminal 3.

---

### Два одинаковых устройства "Mac" в списке при создании чата

**Симптом:** при создании чата с пользователем, у которого Electron, показывается два устройства с одинаковым именем "Mac".

**Причина:** Electron запускался несколько раз → создано несколько активных сессий. Каждая сессия — отдельное "устройство" в системе.

**Решение:** в Настройках → Устройства завершить лишние сессии. Либо не запускать `dev:electron` и `dev:electron:attach` одновременно.

---

### Чаты не видны на другом устройстве (ожидаемо)

**Симптом:** создал чат с устройства A — на устройстве B он не появляется.

**Причина:** это не баг. Чаты хранятся в локальной SQLite каждого устройства. Для появления чата у собеседника нужен обмен ключами через WSS (реализуется в Фазе 2).

---

### Сообщения не отправляются (ожидаемо до Фазы 2)

**Симптом:** чат в статусе `pending_key`, ввод заблокирован или сообщения не доходят.

**Причина:** Фаза 2 (ECDH key exchange + AES-256-GCM шифрование) ещё не реализована. До завершения обмена ключами сообщения не могут быть зашифрованы и отправлены.
