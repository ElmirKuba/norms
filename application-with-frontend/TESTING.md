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
