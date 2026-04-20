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
      contextIsolation: true, // ОБЯЗАТЕЛЬНО true — безопасность
      nodeIntegration: false, // ОБЯЗАТЕЛЬНО false — безопасность
      sandbox: false, // false если нужен preload с Node API
    },
  });

  if (isDev) {
    // Dev-режим: грузим Angular dev server
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: грузим собранные файлы
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'norms', 'browser', 'index.html'));
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
