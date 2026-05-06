import { Injectable } from '@angular/core';

declare global {
  /** Расширение глобального Window для платформенных API */
  interface Window {
    /** API Electron, внедряемый через preload.ts */
    electronAPI?: Record<string, unknown>;
    /** API Capacitor, доступный на нативных платформах */
    // eslint-disable-next-line @typescript-eslint/naming-convention -- внешнее API Capacitor использует PascalCase
    Capacitor?: {
      /** Возвращает идентификатор платформы: 'ios' | 'android' | 'web' */
      getPlatform?: () => string;
    };
  }
}

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
  WEB = 'web',
}

/** Группы платформ для удобных проверок */
export type PlatformFamily = 'mobile' | 'desktop' | 'web';

/** Операционные системы пользователя */
export enum OperatingSystem {
  WINDOWS = 'windows',
  MACOS = 'macos',
  IOS = 'ios',
  ANDROID = 'android',
  LINUX = 'linux',
  UNKNOWN = 'unknown',
}

/** Определяет текущую платформу при старте и предоставляет удобные геттеры */
@Injectable({ providedIn: 'root' })
export class PlatformDetectorService {
  /** Текущая платформа — определяется один раз */
  public readonly platform: AppPlatform;

  /** Группа платформ */
  public readonly family: PlatformFamily;

  /** Конкретная ОС */
  public readonly os: OperatingSystem = OperatingSystem.UNKNOWN;

  public constructor() {
    this.platform = this._detect();
    this.family = this._resolveFamily(this.platform);
    this.os = this._detectOS();
  }

  /** Возвращает true, если платформа — iOS */
  public get isIOS(): boolean {
    return this.platform === AppPlatform.IOS;
  }

  /** Возвращает true, если платформа — Android */
  public get isAndroid(): boolean {
    return this.platform === AppPlatform.ANDROID;
  }

  /** Возвращает true, если платформа — мобильная (iOS или Android) */
  public get isMobile(): boolean {
    return this.family === 'mobile';
  }

  /** Возвращает true, если платформа — Electron (desktop) */
  public get isElectron(): boolean {
    return this.family === 'desktop';
  }

  /** Возвращает true, если платформа — обычный браузер */
  public get isWeb(): boolean {
    return this.platform === AppPlatform.WEB;
  }

  /** Возвращает true, если ОС — Windows (только Electron) */
  public get isWindows(): boolean {
    return this.platform === AppPlatform.ELECTRON_WINDOWS;
  }

  /** Возвращает true, если ОС — macOS (только Electron) */
  public get isMacOS(): boolean {
    return this.platform === AppPlatform.ELECTRON_MACOS;
  }

  /** Возвращает true, если ОС — Linux (только Electron) */
  public get isLinux(): boolean {
    return this.platform === AppPlatform.ELECTRON_LINUX;
  }

  /**
   * Определяет текущую платформу по наличию платформенных API в window.
   * @returns Идентифицированная платформа
   */
  private _detect(): AppPlatform {
    // 1. Electron? Проверяем наличие electronAPI (из preload.ts)
    if (typeof window !== 'undefined' && window.electronAPI !== undefined) {
      return this._detectElectronOS();
    }

    // 2. Capacitor? Проверяем наличие Capacitor на window
    if (typeof window !== 'undefined' && window.Capacitor !== undefined) {
      const nativePlatform: string | undefined = window.Capacitor.getPlatform?.();
      if (nativePlatform === 'ios') return AppPlatform.IOS;
      if (nativePlatform === 'android') return AppPlatform.ANDROID;
    }

    // 3. Fallback — обычный браузер
    return AppPlatform.WEB;
  }

  /**
   * Определяет ОС внутри Electron по userAgent.
   * @returns Платформа Electron для текущей ОС
   */
  private _detectElectronOS(): AppPlatform {
    // navigator.userAgent содержит информацию об ОС даже в Electron
    const ua: string = navigator.userAgent.toLowerCase();

    if (ua.includes('win')) return AppPlatform.ELECTRON_WINDOWS;
    if (ua.includes('mac')) return AppPlatform.ELECTRON_MACOS;
    if (ua.includes('linux')) return AppPlatform.ELECTRON_LINUX;

    return AppPlatform.ELECTRON_WINDOWS;
  }

  /**
   * Определяет группу платформы по конкретной платформе.
   * @param platform - Текущая платформа
   * @returns Группа платформы
   */
  private _resolveFamily(platform: AppPlatform): PlatformFamily {
    switch (platform) {
      case AppPlatform.IOS:
      case AppPlatform.ANDROID:
        return 'mobile';
      case AppPlatform.ELECTRON_WINDOWS:
      case AppPlatform.ELECTRON_MACOS:
      case AppPlatform.ELECTRON_LINUX:
        return 'desktop';
      case AppPlatform.WEB:
        return 'web';
    }
  }

  /**
   * Новый метод: Определяет ОС на основе userAgent или платформенных API
   * @returns Обнаруженная OС
   */
  private _detectOS(): OperatingSystem {
    if (typeof window === 'undefined') return OperatingSystem.UNKNOWN;

    const ua = navigator.userAgent.toLowerCase();

    // 1. Проверка на мобильные ОС (включая браузер и натив)
    if (/iphone|ipad|ipod/.test(ua)) return OperatingSystem.IOS;
    if (ua.includes('android')) return OperatingSystem.ANDROID;

    // 2. Проверка iPad на новых iOS (которые прикидываются Mac)
    if (ua.includes('mac') && navigator.maxTouchPoints > 1) return OperatingSystem.IOS;

    // 3. Десктопные ОС
    if (ua.includes('win')) return OperatingSystem.WINDOWS;
    if (ua.includes('mac')) return OperatingSystem.MACOS;
    if (ua.includes('linux')) return OperatingSystem.LINUX;

    return OperatingSystem.UNKNOWN;
  }
}
