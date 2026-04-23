export {};

declare global {
  /** Расширение глобального Window для Electron preload API */
  interface Window {
    /** API Electron, внедряемый через preload.ts */
    electronAPI?: {
      /** Возвращает версию приложения из package.json */
      getAppVersion: () => Promise<string>;
      /** Возвращает идентификатор ОС: 'win32' | 'darwin' | 'linux' */
      getPlatform: () => Promise<string>;
      // добавляй сюда новые методы по мере расширения preload.ts
    };
  }
}
