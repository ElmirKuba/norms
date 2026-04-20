"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Вызовы к main process
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    getPlatform: () => electron_1.ipcRenderer.invoke('get-platform'),
    // Файловая система, нативные диалоги и т.д. — добавляй сюда
    // Пример:
    // showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
    // Подписка на события из main process
    onDeepLink: (callback) => {
        electron_1.ipcRenderer.on('deep-link', (_event, url) => callback(url));
    },
});
//# sourceMappingURL=preload.js.map