# Платформенный слой

Вся платформо-специфичная логика инкапсулирована в Angular DI-сервисах. Компоненты не вызывают Capacitor, Electron или нативные API напрямую — только через инжектированные абстрактные сервисы.

## Детекция платформы

Порядок имеет значение. Capacitor в Electron вернёт `'web'` (он не знает про Electron), поэтому Electron проверяется первым.

```typescript
export enum AppPlatform {
  IOS = 'ios',
  ANDROID = 'android',
  ELECTRON_WINDOWS = 'electron-windows',
  ELECTRON_MACOS = 'electron-macos',
  ELECTRON_LINUX = 'electron-linux',
  WEB = 'web',
}

export type PlatformFamily = 'mobile' | 'desktop' | 'web';

@Injectable({ providedIn: 'root' })
export class PlatformDetectorService {
  readonly platform: AppPlatform;
  readonly family: PlatformFamily;

  // Удобные геттеры: isMobile, isElectron, isWeb, isIOS, isAndroid, ...

  private detect(): AppPlatform {
    // 1. Electron? Проверяем наличие electronAPI (из preload.ts)
    if (window.electronAPI) return this.detectElectronOS();
    // 2. Capacitor?
    if ((window as any).Capacitor?.getPlatform?.() === 'ios') return AppPlatform.IOS;
    if ((window as any).Capacitor?.getPlatform?.() === 'android') return AppPlatform.ANDROID;
    // 3. Fallback — браузер
    return AppPlatform.WEB;
  }
}
```

`window.electronAPI` устанавливается в Electron preload-скрипте через `contextBridge`:
```typescript
// electron/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  onDeepLink: (cb) => ipcRenderer.on('deep-link', (_e, url) => cb(url)),
});
```

**Маппинг для бэка:** при отправке на сервер (login, session creation) гранулярная платформа маппится в `'ios' | 'android' | 'electron'` — бэк не различает ОС десктопа.

## DI-паттерн: abstract class + useFactory

Каждый сервис — абстрактный класс с контрактом + 3 платформенные реализации (Electron, Capacitor, Browser-stub).

**Почему abstract class, а не interface:** TypeScript-интерфейсы стираются при компиляции, Angular DI не может использовать их как токены. Абстрактный класс остаётся в runtime — служит и контрактом, и DI-токеном.

```typescript
// services/storage/storage.service.ts
export abstract class StorageService {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract remove(key: string): Promise<void>;
}

// services/storage/storage-electron.service.ts
@Injectable()
export class StorageElectronService extends StorageService {
  async get(key: string): Promise<string | null> {
    return (window as any).electronAPI.storage.get(key);
  }
  // ...
}

// services/storage/storage-capacitor.service.ts
@Injectable()
export class StorageCapacitorService extends StorageService {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }
  // ...
}

// services/storage/storage-web.service.ts
@Injectable()
export class StorageWebService extends StorageService {
  async get(): Promise<string | null> {
    throw new BrowserNotSupportedError('StorageService');
  }
  // ...
}
```

Связка в `app.config.ts` через фабрику:
```typescript
// services/storage/storage.provider.ts
export function storageServiceFactory(platform: PlatformDetectorService): StorageService {
  if (platform.isMobile) return new StorageCapacitorService();
  if (platform.isElectron) return new StorageElectronService();
  return new StorageWebService();
}

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: StorageService, useFactory: storageServiceFactory, deps: [PlatformDetectorService] },
    // ...
  ],
};
```

## Стандарты Angular

- **Standalone components** — без NgModule. Провайдеры задаются в `app.config.ts`.
- **Single-bundle**: один `ng build` — все три набора реализаций попадают в bundle. Tree-shaking платформенных impl не происходит. Принято как осознанный trade-off ради простоты сборки.

## Браузерная заглушка

Angular **загружается полностью** в браузере, но при `platform.isWeb` маршрутизатор показывает только лендинг + заглушку со ссылками на скачивание. **Никакой регистрации, авторизации, мессенджера или настроек в вебе** — всё это требует нативной прилы.

Все платформенные сервисы имеют браузерную реализацию, которая бросает `BrowserNotSupportedError` — защита от случайной утечки функционала через прямой URL или баг роутера.

Ссылки на скачивание фронт получает от бэка (`GET /api/v1/app/downloads`) при инициализации **только если `platform.isWeb`**. На странице — детект ОС через `navigator.userAgent` / `navigator.userAgentData` для подсветки релевантной кнопки (на macOS — крупно `.dmg`, остальные мелкими).

## Структура папок

Группировка по фиче (один сервис — одна папка), не по платформе:

```
src/app/services/
  platform/
    platform.service.ts            ← PlatformDetectorService (providedIn: 'root')
  storage/
    storage.service.ts             ← abstract
    storage-electron.service.ts
    storage-capacitor.service.ts
    storage-web.service.ts
    storage.provider.ts            ← useFactory
  notifications/
    notification.service.ts
    notification-electron.service.ts
    notification-capacitor.service.ts
    notification-web.service.ts
    notification.provider.ts
  ...
```

Все impl одного сервиса видны рядом — проще держать контракт и реализации в синхроне.

## Сервисы MVP

| Сервис | Назначение | Базовая реализация |
|---|---|---|
| `StorageService` | Локальный SQLite + key-value | Capacitor: `@capacitor-community/sqlite` + `@capacitor/preferences`. Electron: `better-sqlite3` + `electron-store` |
| `NotificationService` | Локальные нотификации + push hook | Capacitor: `@capacitor/push-notifications` + `@capacitor/local-notifications`. Electron: Notification API |
| `NetworkService` | online/offline, тип соединения | Capacitor: `@capacitor/network`. Electron: `navigator.onLine` + IPC main check |
| `BiometricService` | Face ID / Touch ID / fingerprint для разблокировки приватных ключей | Capacitor: `@aparajita/capacitor-biometric-auth`. Electron: `keytar` + системные API |
| `ClipboardService` | Копирование UIN, ID чата, инвайт-ссылок | Capacitor: `@capacitor/clipboard`. Electron: `clipboard` API |
| `CryptoService` | E2E шифрование (асимметрика, ключи чатов) | Все: Web Crypto API |
| `DeviceInfoService` | Системное имя устройства (раздел 7) | Capacitor: `@capacitor/device`. Electron: `os.hostname()` + `os.platform()` |
| `AppLifecycleService` | foreground/background события | Capacitor: `@capacitor/app`. Electron: `BrowserWindow` events через IPC |
| `DeepLinkService` | Открытие приложения по инвайт-ссылке | Capacitor: `@capacitor/app` + URL scheme. Electron: `app.setAsDefaultProtocolClient` + `open-url` |
| `HapticsService` | Вибрация при событиях | Capacitor: `@capacitor/haptics`. Electron/Browser: stub |
| `WindowService` | Tray, badge counter, минимизация (Electron-only) | Electron: `Tray` + `setBadgeCount`. Capacitor: `@capawesome/capacitor-badge`. Browser: stub |
| `UpdaterService` | Автообновление | Electron: `electron-updater`. Capacitor: проверка версии через store API + redirect |

## Отложено за пределы MVP

- `FilePickerService` — отправка файлов
- `CameraService` — отправка фото
- Любые медиа в чатах

Добавятся после реализации базового текстового обмена. См. [PROJECT.md](../PROJECT.md) → Non-Goals (MVP).
