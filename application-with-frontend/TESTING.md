# Тестирование

## Одновременно: Electron + iOS симулятор + Android эмулятор

Один `ng serve` на всех. Три разных аккаунта — можно тестировать чаты между платформами.

### Порядок запуска

Все команды из `application-with-frontend/`. Порядок важен.

**Terminal 1** — ng serve (должен стартовать первым):
```bash
npm run dev:serve
```
Дождаться строки `Application bundle generation complete` перед запуском остальных.

**Terminal 2** — Electron (ждёт localhost:4200 автоматически):
```bash
npm run dev:electron:attach
```

**Terminal 3** — iOS симулятор (sync + запуск):
```bash
npm run dev:ios:attach
```

**Terminal 4** — Android эмулятор (эмулятор должен быть уже запущен):
```bash
npm run dev:android:attach
```
> Скрипт автоматически запускает `adb reverse` до деплоя — Android загружается с `localhost:4200` (secure context, `crypto.subtle` работает).
> iOS симулятору `adb reverse` не нужен — он разделяет сеть с маком напрямую.

**Бэкенд** — из `backend/`:
```bash
npm run start:dev
```

---

### Если изменился код и нужно применить на устройстве

`ng serve` подхватывает изменения `.ts`/`.scss` автоматически — live reload работает без перезапуска терминалов.

Если нужно пересинхронизировать нативную часть (изменился `capacitor.config.ts`, добавлен Capacitor-плагин и т.п.) — перезапустить соответствующий терминал:

```bash
# Terminal 3 — перезапустить iOS
npm run dev:ios:attach

# Terminal 4 — перезапустить Android (после: npm run dev:android:reverse)
npm run dev:android:attach
```

---

## Тестирование одной платформы

Использовать те же `:attach`-скрипты. Сначала запустить `npm run dev:serve` в отдельном терминале, затем:

```bash
# Electron (запускает ng serve внутри, отдельный Terminal 1 не нужен)
npm run dev:electron

# iOS симулятор
npm run dev:serve        # Terminal 1
npm run dev:ios:attach   # Terminal 2

# Android эмулятор
npm run dev:serve          # Terminal 1
npm run dev:android:attach # Terminal 2
npm run dev:android:reverse # Terminal 3 (после загрузки эмулятора)
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

**Причина:** `better-sqlite3` — нативный модуль. Electron использует свою версию Node.js, которая отличается от системной.

**Решение** — один раз после `npm install`:
```bash
npx @electron/rebuild -f -w better-sqlite3
```

---

### iOS: Web Inspector показывает старый IP вместо localhost

**Симптом:** в Safari → Develop → iPhone 17 Pro → URL показывает `192.168.1.13:4200` вместо `localhost`.

**Причина:** `cap sync` не был запущен после изменения `capacitor.config.ts` (или запускался без флага `CAP_DEV=true`).

**Решение:** перезапустить Terminal 3:
```bash
npm run dev:ios:attach
```
Скрипт сам делает `CAP_DEV=true cap sync ios` перед запуском. После перезапуска URL в Web Inspector должен смениться на `localhost`.

---

### iOS/Android: изменения в коде не применяются

**Симптом:** поведение приложения не меняется после правки `.ts`-файлов.

**Причина A — live reload не успел:** Angular перекомпилировал, но WebView не перезагрузился.
**Решение:** подождать 2–3 секунды или вручную pull-to-refresh в симуляторе.

**Причина Б — нативная конфигурация устарела:** изменился `capacitor.config.ts`.
**Решение:** перезапустить `dev:ios:attach` / `dev:android:attach`.

---

### Android: экран входа просит инвайт-код, хотя регистрация открытая

**Симптом:** на iOS и Electron регистрация без инвайта, на Android — экран "Код приглашения".

**Причина:** фронт запрашивает `GET /api/v1/app/feature-flags` при нажатии "Зарегистрироваться". Если `adb reverse` не запущен, запрос до бэкенда не доходит. Fallback — `freeRegistration: false` → показывается экран инвайта.

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

**Причина A — ng serve ещё не запустился:** `dev:ios:attach` стартует быстро, но Angular может ещё компилироваться.
**Решение:** дождаться в Terminal 1 строки `Application bundle generation complete` перед запуском Terminal 3.

**Причина Б — неправильный порт:** если запускать `dev:ios:live` (устаревший скрипт) — он использует порт 3000, который занят бэкендом. Использовать только `dev:ios:attach`.

---

### Два одинаковых устройства "Mac" в списке при создании чата

**Симптом:** при создании чата с пользователем, у которого Electron, показывается два устройства с одинаковым именем "Mac".

**Причина:** Electron запускался несколько раз → создано несколько активных сессий.

**Решение:** в Настройках → Устройства завершить лишние сессии. Не запускать `dev:electron` и `dev:electron:attach` одновременно.

---

### Сообщения не отправляются (ожидаемо до реализации шифрования)

**Симптом:** чат создан, но ввод заблокирован или сообщения не отправляются.

**Причина:** обмен ключами (ECDH) и шифрование (AES-256-GCM) ещё не реализованы в UI. Чат сохраняется в статусе `pending_key` — это ожидаемо.
