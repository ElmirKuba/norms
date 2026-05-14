# Платформенный слой

Платформо-специфичная логика инкапсулирована в Angular DI-сервисах. Компоненты не вызывают Capacitor, Electron или нативные API напрямую — только через инжектированные абстрактные сервисы.

## Детекция платформы

`core/services/platform/platform.service.ts`. Порядок проверки важен: Capacitor в Electron вернёт `'web'` (не знает про Electron), поэтому Electron проверяется первым.

```typescript
export enum AppPlatform {
  IOS = 'ios',
  ANDROID = 'android',
  ELECTRON_WINDOWS = 'electron-windows',
  ELECTRON_MACOS = 'electron-macos',
  ELECTRON_LINUX = 'electron-linux',
  WEB = 'web',
}

export enum OperatingSystem {
  WINDOWS = 'windows',
  MACOS = 'macos',
  IOS = 'ios',
  ANDROID = 'android',
  LINUX = 'linux',
  UNKNOWN = 'unknown',
}

@Injectable({ providedIn: 'root' })
export class PlatformDetectorService {
  readonly platform: AppPlatform;
  readonly family: PlatformFamily;   // 'mobile' | 'desktop' | 'web'
  readonly os: OperatingSystem;

  // Геттеры: isMobile, isElectron, isWeb, isIOS, isAndroid, ...
}
```

**Логика детекта:**
1. `window.electronAPI` (выставляется в Electron preload через `contextBridge`) → Electron + детект ОС.
2. `window.Capacitor.getPlatform() === 'ios' | 'android'` → Capacitor.
3. Иначе → `WEB`.

**`OperatingSystem`** — отдельный enum, определяет ОС пользователя userAgent-based. Используется в основном на веб-лендинге для подсветки кнопки скачивания. В Electron `os` совпадает с гранулярной платформой, в Capacitor — с `ios` / `android`.

**Маппинг для бэка:** при `account/create` / `account/auth` гранулярная платформа маппится в `'ios' | 'android' | 'electron'` (бэк не различает ОС десктопа).

## DI-паттерн: abstract class + useFactory

Каждый платформенный сервис — абстрактный класс + 3 реализации (Electron, Capacitor, Web). Web-реализация бросает ошибку или возвращает заглушку — защита от случайной утечки функционала через прямой URL.

**Почему abstract class, а не interface:** TS-интерфейсы стираются при компиляции, Angular DI не может использовать их как токены. Абстрактный класс остаётся в runtime — служит и контрактом, и DI-токеном.

Шаблон (на примере `StorageService`):

```typescript
// core/services/storage/storage.service.ts
export abstract class StorageService {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract remove(key: string): Promise<void>;
}

// core/services/storage/storage.provider.ts
export function storageServiceFactory(platform: PlatformDetectorService): StorageService {
  if (platform.isMobile) return new StorageCapacitorService();
  if (platform.isElectron) return new StorageElectronService();
  return new StorageWebService();
}

// app.config.ts
providers: [
  { provide: StorageService, useFactory: storageServiceFactory, deps: [PlatformDetectorService] },
]
```

## Реализованные сервисы

| Сервис | Папка | Реализации | Назначение |
|---|---|---|---|
| `PlatformDetectorService` | `platform/` | один `providedIn: 'root'` | Детект платформы и ОС |
| `StorageService` | `storage/` | electron / capacitor / web | Обычное key-value хранилище. Electron: `electron-store` через IPC. Capacitor: `@capacitor/preferences`. Web: throws |
| `SecureStorageService` | `secure-storage/` | electron / capacitor / web | OS keychain для токенов и (в будущем) мастер-ключа. Electron: `safeStorage` (macOS Keychain / Win DPAPI / Linux libsecret) через IPC. **Capacitor: TODO-заглушка** — нужен native plugin (например `capacitor-secure-storage-plugin`). Web: throws |
| `TokenStorageService` | `storage/token-storage.service.ts` | один | Не платформенный. Использует `SecureStorageService`. `loadFromStorage()` вызывается в `APP_INITIALIZER` для восстановления сессии |
| `FeatureFlagsService` | `feature-flags/` | один | Не платформенный. `GET /api/v1/app/feature-flags` через `APP_INITIALIZER`. При ошибке — дефолтные флаги |
| `WssService` | `wss/` | один | Не платформенный. WSS-коннект, ping/pong, token refresh за 3с до истечения JWT exp, диспетчеризация событий |
| `ThemeService` | `theme/` | один | Не платформенный |

## Структура папок

Группировка по фиче (один сервис — одна папка), не по платформе. Все платформенные сервисы и core-сервисы живут в `core/services/`:

```
src/app/core/services/
  platform/
    platform.service.ts
  storage/
    storage.service.ts                 ← abstract
    storage-electron.service.ts
    storage-capacitor.service.ts
    storage-web.service.ts
    storage.provider.ts                ← useFactory
    token-storage.service.ts           ← не платформенный, использует SecureStorage
  secure-storage/
    secure-storage.service.ts          ← abstract
    secure-storage-electron.service.ts
    secure-storage-capacitor.service.ts ← TODO
    secure-storage-web.service.ts
    secure-storage.provider.ts
  feature-flags/
  wss/
  theme/
  session/                              ← API-клиенты (не платформенные)
```

Все impl одного сервиса видны рядом — проще держать контракт и реализации в синхроне.

## Стандарты Angular

- **Standalone components** — без NgModule. Провайдеры в `app.config.ts`.
- **Single-bundle**: один `ng build` — все три набора реализаций попадают в bundle. Tree-shaking платформенных impl не делается. Принято как осознанный trade-off ради простоты сборки (см. [`frontend-architecture.md`](frontend-architecture.md)).

## Браузерная заглушка

Angular загружается полностью в браузере, но при `platform.isWeb` `platformGuard` пропускает только `/web/*` маршруты. Никакой регистрации, авторизации, мессенджера или настроек в вебе — всё это требует нативной прилы.

Web-реализации платформенных сервисов бросают ошибки — защита от случайной утечки функционала через прямой URL или баг роутера.

## Что ещё не реализовано

Из ранее задуманных платформенных сервисов в коде нет:

| Сервис | Назначение | Когда |
|---|---|---|
| `CryptoService` | Web Crypto API: ECDH X25519, HKDF-SHA256, AES-256-GCM | Шаг 9.24 (см. [TODO.md](../TODO.md)) |
| `LocalDbService` | SQLite (per-account). Electron: `better-sqlite3`. Capacitor: `@capacitor-community/sqlite` | Шаг 9.11 |
| `DeviceInfoService` | Системное имя устройства для `system_name` при логине/регистрации (сейчас собирается inline в auth-компонентах) | После шага 9 |
| `NotificationService` | Локальные уведомления + push-hook | После APNs/FCM (см. [`push-notifications.md`](push-notifications.md)) |
| `NetworkService` | online/offline | По мере необходимости |
| `BiometricService` | Face ID / Touch ID для разблокировки приватных ключей | Шаг 9+ (с E2E) |
| `ClipboardService` | Копирование UIN / инвайт-кодов | По мере необходимости (сейчас inline `navigator.clipboard`) |
| `AppLifecycleService` | foreground/background — нужен для корректного reconnect WSS на мобилке (см. [`api-contracts.md`](api-contracts.md#heartbeat-client--server)) | Перед мобильным релизом |
| `DeepLinkService` | Открытие прилы по инвайт-ссылке | Перед публичным запуском |
| `HapticsService`, `WindowService`, `UpdaterService` | Полировка UX, tray, автообновление | После MVP |

## Отложено за пределы MVP

- `FilePickerService` — отправка файлов
- `CameraService` — отправка фото
- Любые медиа в чатах

См. [PROJECT.md](../PROJECT.md) → Non-Goals (MVP).
