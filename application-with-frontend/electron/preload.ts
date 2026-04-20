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
  },
});
