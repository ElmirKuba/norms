import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const isDev = process.argv.includes('--dev');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'norms', 'browser', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Secure Storage (safeStorage API) ---
// Зашифрованные значения хранятся в JSON-файле в userData.
// safeStorage шифрует через OS credentials: macOS Keychain, Windows DPAPI, Linux libsecret.
// Реализация одинакова на всех трёх ОС — разница только в бэкенде шифрования.

const secureStorePath = path.join(app.getPath('userData'), 'secure-store.json');

function readSecureStore(): Record<string, string> {
  try {
    if (!fs.existsSync(secureStorePath)) return {};
    return JSON.parse(fs.readFileSync(secureStorePath, 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeSecureStore(store: Record<string, string>): void {
  fs.writeFileSync(secureStorePath, JSON.stringify(store), 'utf-8');
}

ipcMain.handle('secure-storage:get', (_event, key: string): string | null => {
  if (!safeStorage.isEncryptionAvailable()) return null;
  const store = readSecureStore();
  const encrypted = store[key];
  if (encrypted === undefined) return null;
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  } catch {
    return null;
  }
});

ipcMain.handle('secure-storage:set', (_event, key: string, value: string): void => {
  if (!safeStorage.isEncryptionAvailable()) return;
  const encrypted = safeStorage.encryptString(value).toString('base64');
  const store = readSecureStore();
  store[key] = encrypted;
  writeSecureStore(store);
});

ipcMain.handle('secure-storage:remove', (_event, key: string): void => {
  const store = readSecureStore();
  delete store[key];
  writeSecureStore(store);
});

// --- IPC ---

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});
