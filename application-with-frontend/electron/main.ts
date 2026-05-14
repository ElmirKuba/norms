import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';

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

// --- Local SQLite DB (better-sqlite3, per-account) ---
// DB-файл: userData/norms-{accountId}.db
// WAL-режим для конкурентного чтения; foreign_keys ON.

const LOCAL_DB_SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS peer_devices (
  session_id TEXT PRIMARY KEY, account_id TEXT NOT NULL,
  uin TEXT, nickname TEXT, username TEXT,
  system_name TEXT NOT NULL, device_nickname TEXT
);
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_key',
  peer_session_id TEXT NOT NULL,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_peer_session_id_idx ON chats(peer_session_id);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, chat_id TEXT NOT NULL,
  sender_session_id TEXT NOT NULL, content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sending',
  is_outgoing INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON messages(chat_id, created_at);
CREATE TABLE IF NOT EXISTS chat_keys (
  chat_id            TEXT PRIMARY KEY,
  encrypted_key      TEXT NOT NULL DEFAULT '',
  key_iv             TEXT NOT NULL DEFAULT '',
  encrypted_priv_key TEXT,
  priv_key_iv        TEXT,
  created_at         INTEGER NOT NULL
);
`.trim();

const dbCache = new Map<string, Database.Database>();

function getDb(accountId: string): Database.Database {
  const cached = dbCache.get(accountId);
  if (cached !== undefined) return cached;
  const dbPath = path.join(app.getPath('userData'), `norms-${accountId}.db`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  dbCache.set(accountId, db);
  return db;
}

ipcMain.handle('localdb:init', (_event, accountId: string): void => {
  const db = getDb(accountId);
  db.exec(LOCAL_DB_SCHEMA);
  // Migration: добавить колонки приватного ключа если их нет (для существующих БД)
  const cols = db.pragma('table_info(chat_keys)') as ReadonlyArray<{ readonly name: string }>;
  if (!cols.some((c) => c.name === 'encrypted_priv_key')) {
    db.exec('ALTER TABLE chat_keys ADD COLUMN encrypted_priv_key TEXT');
    db.exec('ALTER TABLE chat_keys ADD COLUMN priv_key_iv TEXT');
  }
});

ipcMain.handle('localdb:run', (_event, accountId: string, sql: string, params: unknown[]): void => {
  const db = getDb(accountId);
  db.prepare(sql).run(params);
});

ipcMain.handle('localdb:all', (_event, accountId: string, sql: string, params: unknown[]): unknown[] => {
  const db = getDb(accountId);
  return db.prepare(sql).all(params);
});

ipcMain.handle('localdb:get', (_event, accountId: string, sql: string, params: unknown[]): unknown => {
  const db = getDb(accountId);
  return db.prepare(sql).get(params);
});
