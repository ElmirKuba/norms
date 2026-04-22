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
  WEB = 'web', // браузер (заглушка)
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
