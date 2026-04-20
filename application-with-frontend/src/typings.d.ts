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
