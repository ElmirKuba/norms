import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),

  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url) => callback(url));
  },

  // Secure storage — шифрование через OS keychain (safeStorage в main process)
  secureStorage: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('secure-storage:get', key),
    set: (key: string, value: string): Promise<void> => ipcRenderer.invoke('secure-storage:set', key, value),
    remove: (key: string): Promise<void> => ipcRenderer.invoke('secure-storage:remove', key),
  },

  // Локальная SQLite-БД (better-sqlite3 в main process, per-account файл)
  localDb: {
    init: (accountId: string): Promise<void> =>
      ipcRenderer.invoke('localdb:init', accountId),
    run: (accountId: string, sql: string, params: readonly unknown[]): Promise<void> =>
      ipcRenderer.invoke('localdb:run', accountId, sql, params),
    all: <T>(accountId: string, sql: string, params: readonly unknown[]): Promise<readonly T[]> =>
      ipcRenderer.invoke('localdb:all', accountId, sql, params),
    get: <T>(accountId: string, sql: string, params: readonly unknown[]): Promise<T | undefined> =>
      ipcRenderer.invoke('localdb:get', accountId, sql, params),
  },
});
