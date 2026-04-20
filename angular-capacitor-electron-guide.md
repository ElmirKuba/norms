# Angular + Capacitor + Electron: Полная инструкция

> Один проект, один `package.json`, один `ng build` → 5 платформ: iOS, Android, Windows, macOS, Linux.
>
> **Стек:** Angular 21 · SCSS · Flexbox · Capacitor 8 · Electron 41 · Node.js 22+

---

## Содержание

1. [Подготовка окружения](#1-подготовка-окружения)
2. [Создание проекта](#2-создание-проекта)
3. [Структура проекта](#3-структура-проекта)
4. [Настройка Capacitor](#4-настройка-capacitor)
5. [Настройка Electron](#5-настройка-electron)
6. [Platform Detection Service](#6-platform-detection-service)
7. [Пример платформенного DI-сервиса](#7-пример-платформенного-di-сервиса)
8. [Все скрипты в package.json](#8-все-скрипты-в-packagejson)
9. [Dev-режим с отладкой](#9-dev-режим-с-отладкой)
10. [Production-сборка](#10-production-сборка)
11. [Частые проблемы и решения](#11-частые-проблемы-и-решения)

---

## 1. Подготовка окружения

### Обязательно для всех платформ

```bash
# Node.js 22+ (Capacitor 8 требует >= 22)
node -v   # должно быть v22.x.x или выше

# Angular CLI глобально
npm install -g @angular/cli

# Проверка
ng version
```

### Для iOS (только macOS)

- **Xcode 26+** — скачай из App Store
- **CocoaPods** (если проект не на SPM):
  ```bash
  sudo gem install cocoapods
  ```
- **Xcode Command Line Tools:**
  ```bash
  xcode-select --install
  ```
- **iOS Simulator** — откроешь через Xcode → Settings → Components (или Platforms, зависит от версии Xcode) → скачай нужную iOS версию

### Для Android (Windows / macOS / Linux)

- **Android Studio** (Otter 2025.2.1 или новее) — скачай с developer.android.com
- В Android Studio → Settings → SDK Manager:
  - SDK Platforms: Android 14 (API 34) или новее
  - SDK Tools: Android SDK Build-Tools, Android Emulator, Android SDK Platform-Tools
- Создай эмулятор: Android Studio → Device Manager → Create Device → выбери телефон → скачай образ системы → Finish
- **Переменные окружения (добавь в `~/.bashrc` или `~/.zshrc`):**
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk    # macOS
  # export ANDROID_HOME=$HOME/Android/Sdk          # Linux
  # set ANDROID_HOME=C:\Users\YOU\AppData\Local\Android\Sdk  # Windows (в System Variables)
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  export PATH=$PATH:$ANDROID_HOME/emulator
  ```
- **Java 17+** — Android Studio обычно ставит свою, но проверь:
  ```bash
  java -version
  ```

### Для Desktop (Electron)

На Windows, macOS и Linux ничего дополнительного не нужно — Electron сам тащит Chromium и Node.js. Для сборки установочных пакетов потребуется `electron-builder` (установим позже как devDependency).

---

## 2. Создание проекта

```bash
# Создаём Angular проект
# --style=scss       — SCSS вместо CSS
# --ssr=false        — без серверного рендеринга (нам не нужен)
# --skip-tests       — опционально, если хочешь без spec-файлов
ng new norms --style=scss --ssr=false

cd norms
```

**Что произошло:**
- Создана папка `norms/` с Angular 21, standalone-компонентами, SCSS, Vitest
- Единственный `package.json` в корне — именно так и оставим

### Проверяем что Angular работает

```bash
ng serve --open
# Откроется http://localhost:4200 — должна отобразиться стартовая страница Angular
# Ctrl+C чтобы остановить
```

---

## 3. Структура проекта

После всех настроек структура будет такой:

```
norms/
├── src/                          # Angular приложение (renderer)
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.config.ts         # провайдеры, включая платформенные DI
│   │   ├── app.routes.ts
│   │   └── services/
│   │       └── platform/
│   │           ├── platform.service.ts         # abstract class
│   │           ├── platform-web.service.ts     # реализация для браузера
│   │           ├── platform-capacitor.service.ts  # реализация для Capacitor
│   │           ├── platform-electron.service.ts   # реализация для Electron
│   │           └── platform.provider.ts        # useFactory
│   ├── styles.scss               # глобальные стили
│   ├── index.html
│   └── main.ts
├── electron/                     # Electron main process
│   ├── main.ts                   # точка входа Electron
│   ├── preload.ts                # preload-скрипт (contextBridge)
│   └── tsconfig.json             # отдельный tsconfig для Electron
├── ios/                          # Capacitor iOS (генерируется автоматически)
├── android/                      # Capacitor Android (генерируется автоматически)
├── capacitor.config.ts           # конфиг Capacitor
├── angular.json
├── package.json                  # ЕДИНСТВЕННЫЙ package.json
└── tsconfig.json
```

---

## 4. Настройка Capacitor

### 4.1 Установка зависимостей

```bash
# Core Capacitor
npm install @capacitor/core
npm install -D @capacitor/cli

# Платформы
npm install @capacitor/ios @capacitor/android

# Базовые плагины (нужны почти всегда)
npm install @capacitor/app          # lifecycle: appStateChange, backButton
npm install @capacitor/haptics      # вибрация
npm install @capacitor/keyboard     # клавиатура на мобилках
npm install @capacitor/status-bar   # если поддерживаешь Capacitor 7 девайсы
```

### 4.2 Инициализация

```bash
npx cap init norms app.normisy.space --web-dir=dist/norms/browser
```

**Объяснение параметров:**
- `norms` — название приложения
- `app.normisy.space` — bundle ID
- `--web-dir=dist/norms/browser` — путь к собранным файлам Angular после `ng build`

> **Важно:** Angular 21 по умолчанию кладёт билд в `dist/norms/browser/`. Убедись что путь совпадает. Проверь: запусти `ng build` и посмотри куда легли `index.html` и папка `assets/`.

### 4.3 Отредактируй `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.normisy.space',
  appName: 'norms',
  webDir: 'dist/norms/browser',

  // Dev-режим: Capacitor будет грузить с ng serve (live reload)
  // Раскомментируй ТОЛЬКО когда разрабатываешь с мобилкой.
  // Перед билдом обязательно закомментируй обратно!
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:4200',  // замени на свой IP (не localhost!)
  //   cleartext: true
  // }
};

export default config;
```

### 4.4 Добавление платформ

```bash
# Сначала соберём Angular
ng build

# Теперь добавляем платформы
npx cap add ios       # создаст папку ios/
npx cap add android   # создаст папку android/
```

### 4.5 Проверяем что работает

```bash
# iOS (только macOS)
npx cap open ios      # откроет Xcode — нажми Run (▶)

# Android
npx cap open android  # откроет Android Studio — нажми Run (▶)
```

---

## 5. Настройка Electron

### 5.1 Установка зависимостей

```bash
# Electron и сборщик
npm install -D electron electron-builder

# Утилиты для dev-режима
npm install -D wait-on concurrently

# Для сборки main.ts (Electron написан на TypeScript)
npm install -D ts-node
```

### 5.2 Создай папку `electron/`

```bash
mkdir electron
```

### 5.3 `electron/tsconfig.json`

Electron main process — это отдельный Node.js-контекст, ему нужен свой tsconfig.

> **Заметка:** Electron 41 (Node 24) поддерживает ESM, но CommonJS проще для старта — не нужно менять импорты и `package.json` type. Переход на ESM можно сделать позже без влияния на Angular-часть.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "../dist-electron",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["./**/*.ts"]
}
```

### 5.4 `electron/main.ts`

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

// Определяем режим: dev или production
const isDev = process.argv.includes('--dev');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // ОБЯЗАТЕЛЬНО true — безопасность
      nodeIntegration: false,   // ОБЯЗАТЕЛЬНО false — безопасность
      sandbox: false            // false если нужен preload с Node API
    }
  });

  if (isDev) {
    // Dev-режим: грузим Angular dev server
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: грузим собранные файлы
    mainWindow.loadFile(
      path.join(__dirname, '..', 'dist', 'norms', 'browser', 'index.html')
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: пересоздаём окно по клику на иконку в Dock
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // macOS: приложение не закрывается при закрытии всех окон
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC-хендлеры ---
// Пример: Angular может вызвать window.electronAPI.getAppVersion()
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform; // 'win32' | 'darwin' | 'linux'
});
```

### 5.5 `electron/preload.ts`

Preload — мост между Node.js (main process) и Angular (renderer). Через `contextBridge` ты безопасно экспонируешь API в `window`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Вызовы к main process
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),

  // Файловая система, нативные диалоги и т.д. — добавляй сюда
  // Пример:
  // showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),

  // Подписка на события из main process
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url) => callback(url));
  }
});
```

### 5.6 Типизация `window.electronAPI` для Angular

Создай файл `src/typings.d.ts`:

```typescript
export {};

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      // добавляй сюда новые методы по мере расширения preload.ts
    };
  }
}
```

### 5.7 Сборка Electron main process

Добавь в корневой `package.json` поле `"main"`:

```json
{
  "name": "norms",
  "main": "dist-electron/main.js",
  ...
}
```

Electron ищет `main` в `package.json` и запускает указанный файл.

### 5.8 Конфигурация `electron-builder`

Добавь в `package.json`:

```json
{
  "build": {
    "appId": "app.normisy.space",
    "productName": "Norms",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/norms/browser/**/*",
      "dist-electron/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.social-networking",
      "target": [
        { "target": "dmg", "arch": ["universal"] }
      ]
    },
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] }
      ]
    },
    "linux": {
      "target": [
        { "target": "AppImage", "arch": ["x64"] }
      ],
      "category": "Network"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## 6. Platform Detection Service

Это ключевой сервис — определяет где запущено приложение.

### 6.1 `src/app/services/platform/platform.service.ts`

```typescript
import { Injectable } from '@angular/core';

/**
 * Перечисление всех поддерживаемых платформ.
 * Определяется один раз при старте приложения.
 */
export enum AppPlatform {
  IOS = 'ios',
  ANDROID = 'android',
  ELECTRON_WINDOWS = 'electron-windows',
  ELECTRON_MACOS = 'electron-macos',
  ELECTRON_LINUX = 'electron-linux',
  WEB = 'web'  // браузер (заглушка)
}

/**
 * Группы платформ для удобных проверок.
 */
export type PlatformFamily = 'mobile' | 'desktop' | 'web';

@Injectable({ providedIn: 'root' })
export class PlatformDetectorService {

  /** Текущая платформа — определяется один раз */
  readonly platform: AppPlatform;

  /** Группа платформ */
  readonly family: PlatformFamily;

  constructor() {
    this.platform = this.detect();
    this.family = this.resolveFamily(this.platform);
  }

  // --- Удобные геттеры ---

  get isIOS(): boolean {
    return this.platform === AppPlatform.IOS;
  }
  get isAndroid(): boolean {
    return this.platform === AppPlatform.ANDROID;
  }
  get isMobile(): boolean {
    return this.family === 'mobile';
  }
  get isElectron(): boolean {
    return this.family === 'desktop';
  }
  get isWeb(): boolean {
    return this.platform === AppPlatform.WEB;
  }
  get isWindows(): boolean {
    return this.platform === AppPlatform.ELECTRON_WINDOWS;
  }
  get isMacOS(): boolean {
    return this.platform === AppPlatform.ELECTRON_MACOS;
  }
  get isLinux(): boolean {
    return this.platform === AppPlatform.ELECTRON_LINUX;
  }

  // --- Детекция ---

  private detect(): AppPlatform {
    // 1. Electron? Проверяем наличие electronAPI (из preload.ts)
    if (typeof window !== 'undefined' && window.electronAPI) {
      return this.detectElectronOS();
    }

    // 2. Capacitor? Проверяем наличие Capacitor на window
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const capacitor = (window as any).Capacitor;
      const nativePlatform = capacitor.getPlatform?.() as string;

      if (nativePlatform === 'ios') return AppPlatform.IOS;
      if (nativePlatform === 'android') return AppPlatform.ANDROID;
    }

    // 3. Fallback — обычный браузер
    return AppPlatform.WEB;
  }

  private detectElectronOS(): AppPlatform {
    // navigator.userAgent содержит информацию об ОС даже в Electron
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('win')) return AppPlatform.ELECTRON_WINDOWS;
    if (ua.includes('mac')) return AppPlatform.ELECTRON_MACOS;
    if (ua.includes('linux')) return AppPlatform.ELECTRON_LINUX;

    // Fallback
    return AppPlatform.ELECTRON_WINDOWS;
  }

  private resolveFamily(platform: AppPlatform): PlatformFamily {
    switch (platform) {
      case AppPlatform.IOS:
      case AppPlatform.ANDROID:
        return 'mobile';
      case AppPlatform.ELECTRON_WINDOWS:
      case AppPlatform.ELECTRON_MACOS:
      case AppPlatform.ELECTRON_LINUX:
        return 'desktop';
      default:
        return 'web';
    }
  }
}
```

### 6.2 Использование в компонентах

```typescript
import { Component, inject } from '@angular/core';
import { PlatformDetectorService } from './services/platform/platform.service';

@Component({
  selector: 'app-root',
  template: `
    <h1>Платформа: {{ platform.platform }}</h1>

    @if (platform.isMobile) {
      <p>Мобильное приложение</p>
    }

    @if (platform.isElectron) {
      <p>Десктоп: {{ platform.platform }}</p>
    }

    @if (platform.isWeb) {
      <p>Скачайте приложение!</p>
    }
  `
})
export class AppComponent {
  platform = inject(PlatformDetectorService);
}
```

---


## 7. Пример платформенного DI-сервиса

Паттерн: abstract class → конкретные реализации → `useFactory` в `app.config.ts`.

### 7.1 Абстрактный класс

`src/app/services/storage/storage.service.ts`:

```typescript
export abstract class StorageService {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract remove(key: string): Promise<void>;
}
```

### 7.2 Реализации

**Capacitor (мобилки)** — `storage-capacitor.service.ts`:

```typescript
import { Preferences } from '@capacitor/preferences';
import { StorageService } from './storage.service';

export class StorageCapacitorService extends StorageService {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
```

> Для этого нужно: `npm install @capacitor/preferences`

**Electron (десктоп)** — `storage-electron.service.ts`:

```typescript
import { StorageService } from './storage.service';

export class StorageElectronService extends StorageService {
  // В Electron используем localStorage (работает в renderer)
  // Для чувствительных данных — IPC к main process + electron-store / keytar
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
```

**Web (заглушка)** — `storage-web.service.ts`:

```typescript
import { StorageService } from './storage.service';

export class StorageWebService extends StorageService {
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
```

### 7.3 Factory-провайдер

`src/app/services/storage/storage.provider.ts`:

```typescript
import { PlatformDetectorService } from '../platform/platform.service';
import { StorageService } from './storage.service';
import { StorageCapacitorService } from './storage-capacitor.service';
import { StorageElectronService } from './storage-electron.service';
import { StorageWebService } from './storage-web.service';

export function storageServiceFactory(
  platform: PlatformDetectorService
): StorageService {
  if (platform.isMobile) return new StorageCapacitorService();
  if (platform.isElectron) return new StorageElectronService();
  return new StorageWebService();
}
```

### 7.4 Регистрация в `app.config.ts`

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { PlatformDetectorService } from './services/platform/platform.service';
import { StorageService } from './services/storage/storage.service';
import { storageServiceFactory } from './services/storage/storage.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    // Платформенные сервисы
    {
      provide: StorageService,
      useFactory: storageServiceFactory,
      deps: [PlatformDetectorService]
    }
  ]
};
```

Теперь в любом компоненте/сервисе:
```typescript
storage = inject(StorageService);
// Вызов одинаковый, а под капотом — правильная реализация для текущей платформы
```

---

## 8. Все скрипты в package.json

```jsonc
{
  "scripts": {
    // ──────────────────────────────────────────────
    // Angular
    // ──────────────────────────────────────────────
    "start": "ng serve",
    "build": "ng build",
    "test": "ng test",

    // ──────────────────────────────────────────────
    // Electron: компиляция main process
    // ──────────────────────────────────────────────
    "electron:compile": "tsc -p electron/tsconfig.json",

    // ──────────────────────────────────────────────
    // Electron: DEV-режим (с hot reload Angular)
    // ──────────────────────────────────────────────
    // Запускает ng serve + ждёт localhost:4200 + запускает Electron
    "dev:electron": "npm run electron:compile && concurrently \"ng serve\" \"wait-on http://localhost:4200 && electron dist-electron/main.js --dev\"",

    // ──────────────────────────────────────────────
    // Electron: PRODUCTION сборка
    // ──────────────────────────────────────────────
    "build:electron": "ng build --base-href=./ && npm run electron:compile && electron-builder",
    "build:electron:win": "ng build --base-href=./ && npm run electron:compile && electron-builder --win",
    "build:electron:mac": "ng build --base-href=./ && npm run electron:compile && electron-builder --mac",
    "build:electron:linux": "ng build --base-href=./ && npm run electron:compile && electron-builder --linux",

    // ──────────────────────────────────────────────
    // Capacitor: синхронизация после билда
    // ──────────────────────────────────────────────
    "cap:sync": "ng build && npx cap sync",

    // ──────────────────────────────────────────────
    // Capacitor iOS: DEV-режим
    // ──────────────────────────────────────────────
    // Откроет Xcode, Angular грузится с dev-сервера
    "dev:ios": "ng build && npx cap sync ios && npx cap open ios",

    // Live reload на симулятор (concurrently: ng serve + cap run, Ctrl+C убивает оба)
    // --target= ID симулятора (узнать: npx cap run ios --list)
    "dev:ios:live": "concurrently \"ng serve --port=3000 --host=0.0.0.0\" \"wait-on http://localhost:3000 && npx cap run ios --live-reload --target=TARGET_ID\"",

    // Live reload на реальный iPhone (подключён по USB)
    // --target= ID устройства (узнать: xcrun xctrace list devices)
    "dev:ios:live-real": "concurrently \"ng serve --port=3000 --host=0.0.0.0\" \"wait-on http://localhost:3000 && npx cap run ios --live-reload --target=DEVICE_ID\"",

    // ──────────────────────────────────────────────
    // Capacitor Android: DEV-режим
    // ──────────────────────────────────────────────
    "dev:android": "ng build && npx cap sync android && npx cap open android",

    // Live reload на эмулятор
    // --target= ID эмулятора (узнать: npx cap run android --list)
    "dev:android:live": "concurrently \"ng serve --port=3000 --host=0.0.0.0\" \"wait-on http://localhost:3000 && npx cap run android --live-reload --target=TARGET_ID\"",

    // Live reload на реальное Android-устройство (подключено по USB, USB debugging включён)
    // --target= ID устройства (узнать: npx cap run android --list)
    "dev:android:live-real": "concurrently \"ng serve --port=3000 --host=0.0.0.0\" \"wait-on http://localhost:3000 && npx cap run android --live-reload --target=DEVICE_ID\"",

    // ──────────────────────────────────────────────
    // Capacitor: PRODUCTION сборка
    // ──────────────────────────────────────────────
    // iOS: собирает Angular и синхронизирует. Финальный .ipa делается в Xcode.
    "build:ios": "ng build --configuration=production && npx cap sync ios",

    // Android: собирает Angular и синхронизирует. APK/AAB делается в Android Studio.
    "build:android": "ng build --configuration=production && npx cap sync android"
  }
}
```

> **Заметка:** В `--target=` подставляй реальные ID своих устройств/симуляторов. Узнать ID:
> - iOS симуляторы: `npx cap run ios --list`
> - iOS реальные устройства: `xcrun xctrace list devices`
> - Android (эмуляторы и реальные): `npx cap run android --list`

---

## 9. Dev-режим с отладкой

### 9.1 Electron (Windows / macOS / Linux)

```bash
npm run dev:electron
```


**Что происходит:**
1. `electron:compile` — компилирует `electron/main.ts` → `dist-electron/main.js`
2. `ng serve` — запускает Angular dev server на `localhost:4200`
3. `wait-on` — ждёт пока dev server поднимется
4. `electron` — открывает окно Electron, грузит `localhost:4200`
5. DevTools открываются автоматически (мы написали `openDevTools()` в `main.ts`)

**Отладка в VS Code (Chrome DevTools внутри Electron):**

Создай `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron (Main Process)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["dist-electron/main.js", "--dev", "--remote-debugging-port=9222"],
      "preLaunchTask": "electron:compile",
      "outFiles": ["${workspaceFolder}/dist-electron/**/*.js"],
      "sourceMaps": true,
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Electron (Renderer / Angular)",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true,
      "sourceMapPathOverrides": {
        "webpack:/*": "${webRoot}/*"
      }
    }
  ],
  "compounds": [
    {
      "name": "Debug Electron (Full)",
      "configurations": [
        "Debug Electron (Main Process)",
        "Debug Electron (Renderer / Angular)"
      ]
    }
  ]
}
```

Добавь `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "electron:compile",
      "type": "shell",
      "command": "npm run electron:compile",
      "problemMatcher": ["$tsc"]
    }
  ]
}
```

**Как пользоваться:**
1. Сначала запусти `ng serve` в терминале
2. В VS Code нажми F5 → выбери "Debug Electron (Full)"
3. Main process: ставишь breakpoint в `electron/main.ts`
4. Renderer (Angular): ставишь breakpoint в `src/app/...` — сработает через Chrome debugger

**Альтернативно:** просто `npm run dev:electron` — DevTools откроются в окне Electron, можно дебажить Angular прямо там (вкладка Sources).

### 9.2 iOS (macOS с Xcode)

```bash
# Способ 1: через Xcode (рекомендуется)
npm run dev:ios
# Откроется Xcode → нажми Run (▶) → приложение запустится в симуляторе
# Для дебага Angular → Safari → Develop → Simulator → выбери страницу

# Способ 2: live reload напрямую (без Xcode)
ng serve --host=0.0.0.0 &   # сначала запусти ng serve
npm run dev:ios:live
```

**Отладка Angular на iOS Simulator:**
1. Открой **Safari** на Mac
2. Меню → Safari → Settings → Advanced → ✅ Show Develop menu
3. Запусти приложение на симуляторе
4. Safari → Develop → Simulator (имя) → localhost (или название приложения)
5. Откроется Web Inspector — полноценный дебагер (breakpoints, network, console)

**Отладка на реальном iPhone:**
1. Подключи iPhone USB-кабелем
2. На iPhone: Settings → Safari → Advanced → ✅ Web Inspector
3. `npx cap run ios --target=DEVICE_ID`  (узнай ID: `xcrun simctl list devices`)
4. Safari → Develop → iPhone (имя) → выбери страницу

> **⚠️ ОСТАНОВИЛСЯ ЗДЕСЬ (9.2 сделан, signing на реальный iPhone отложен)**

### 9.3 Android

```bash
# Способ 1: через Android Studio
npm run dev:android
# Откроется Android Studio → нажми Run (▶) → выбери эмулятор
# Для дебага Angular → Chrome на компьютере → chrome://inspect

# Способ 2: live reload
ng serve --host=0.0.0.0 &
npm run dev:android:live
```

**Отладка Angular на Android Emulator:**
1. Запусти приложение на эмуляторе
2. Открой **Chrome** на компьютере
3. В адресной строке: `chrome://inspect`
4. Должен появиться WebView с твоим приложением → нажми **Inspect**
5. Откроется полноценный Chrome DevTools — breakpoints, network, console, elements

**Отладка на реальном Android-устройстве:**
1. На телефоне: Settings → Developer Options → ✅ USB debugging
2. Подключи USB
3. `npx cap run android` — выбери устройство
4. Chrome → `chrome://inspect` → Inspect

---

## 10. Production-сборка

### 10.1 iOS

```bash
npm run build:ios
# Angular собирается, файлы синхронизируются в ios/App/App/public/

# Дальше в Xcode:
# 1. npx cap open ios
# 2. Выбери Generic iOS Device (или реальное устройство)
# 3. Product → Archive
# 4. Distribute App → App Store Connect
```

### 10.2 Android

```bash
npm run build:android
# Angular собирается, файлы синхронизируются в android/app/src/main/assets/public/

# Дальше в Android Studio:
# 1. npx cap open android
# 2. Build → Generate Signed Bundle / APK
# 3. Выбери Android App Bundle (.aab) для Google Play
# 4. Укажи keystore (создай если нет: Build → Generate Signed Bundle → Create new)
```

### 10.3 Windows

```bash
# На Windows:
npm run build:electron:win
# Создаст release/Norms Setup X.X.X.exe (NSIS installer)
```

### 10.4 macOS

```bash
# На macOS:
npm run build:electron:mac
# Создаст release/Norms-X.X.X.dmg
```

### 10.5 Linux

```bash
# На Linux (или macOS/Windows для Linux-таргета):
npm run build:electron:linux
# Создаст release/Norms-X.X.X.AppImage
```

> **Заметка:** electron-builder может собирать кроссплатформенно, но macOS `.dmg` можно подписать и нотаризировать только на macOS. Windows `.exe` можно собрать где угодно, но подпись (code signing) требует Windows.

---

## 11. Частые проблемы и решения

### `webDir` не найден

```
[error] Could not find the web assets directory: dist/norms/browser
```
**Решение:** Сначала запусти `ng build`. Capacitor копирует уже собранные файлы, а не запускает сборку сам.

### Live reload не работает на мобилке

```
[error] Unable to connect to http://localhost:4200
```
**Решение:** Мобилка не может достучаться до `localhost` компьютера. Используй IP компьютера:
```bash
# Узнай свой IP:
# macOS: ifconfig | grep "inet " | grep -v 127.0.0.1
# Windows: ipconfig
# Linux: ip addr

# Запусти ng serve на всех интерфейсах:
ng serve --host=0.0.0.0

# Затем в capacitor.config.ts (раздел server):
# url: 'http://192.168.1.100:4200'  ← твой IP
```

### Electron: `require is not defined`

**Причина:** `nodeIntegration: false` (и правильно, не включай!).
**Решение:** Используй `preload.ts` + `contextBridge` (как описано выше). Весь Node.js API доступен только через IPC.

### Electron: CORS ошибки при загрузке `file://`

**Причина:** Angular по умолчанию ставит `<base href="/">` в `index.html`. Протокол `file://` не понимает абсолютный `/`.

**Решение:** НЕ меняй `index.html` и `angular.json` глобально — это сломает роутинг на мобилках и в dev-режиме. Вместо этого передавай `--base-href=./` только в скриптах сборки Electron:
```bash
ng build --base-href=./
```
Это уже учтено в скриптах `build:electron:*` ниже.

### Android: `cleartext traffic not permitted`

**Причина:** Android по умолчанию блокирует HTTP (не HTTPS).
**Решение:** Это нужно только для dev live reload. Capacitor 8 уже добавляет правило в `AndroidManifest.xml`. Если не работает:
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application android:usesCleartextTraffic="true" ...>
```

### `window.electronAPI` is undefined на мобилке

Это нормально! На мобилке нет Electron. `PlatformDetectorService` проверяет `window.electronAPI` — если его нет, значит это не Electron.

### Несколько `package.json` — нужно ли?

Для твоего проекта — **нет**. Один `package.json` в корне. Проект angular-electron (belnadris) использует два, но это оптимизация для electron-builder чтобы не тащить dev-зависимости Angular в финальный бандл. Это решается полем `"files"` в конфиге `electron-builder` (как мы и сделали выше).

---

## Шпаргалка: ежедневные команды

| Что делаю | Команда |
|---|---|
| Разработка в браузере | `ng serve` |
| Разработка для Electron | `npm run dev:electron` |
| Разработка для iOS (Xcode) | `npm run dev:ios` → Run в Xcode |
| iOS live reload (симулятор) | `npm run dev:ios:live` |
| iOS live reload (реальный iPhone по USB) | `npm run dev:ios:live-real` |
| Разработка для Android (Android Studio) | `npm run dev:android` → Run в AS |
| Android live reload (эмулятор) | `npm run dev:android:live` |
| Android live reload (реальное устройство по USB) | `npm run dev:android:live-real` |
| Билд iOS для стора | `npm run build:ios` → Archive в Xcode |
| Билд Android для стора | `npm run build:android` → Signed Bundle в AS |
| Билд Windows .exe | `npm run build:electron:win` |
| Билд macOS .dmg | `npm run build:electron:mac` |
| Билд Linux .AppImage | `npm run build:electron:linux` |
| Синхронизация Capacitor | `npm run cap:sync` |

---

## Версии инструментов (апрель 2026)

| Инструмент | Версия | Примечание |
|---|---|---|
| Node.js | 22 LTS | Capacitor 8 требует ≥ 22 |
| Angular | 21.x | Standalone по умолчанию, Vitest, Zoneless |
| Capacitor | 8.3.x | iOS 15+, Android 6+, SPM по умолчанию |
| Electron | 41.x | Chromium 146, Node 24 |
| electron-builder | latest | Сборка установщиков |
| TypeScript | ~5.7 | Поставляется с Angular 21 |

---

*Инструкция создана для проекта с единым codebase: один `ng build` → одна папка `dist/` → Capacitor и Electron потребляют её каждый по-своему.*
