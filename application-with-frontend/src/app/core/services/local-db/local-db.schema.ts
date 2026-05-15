/** SQL-схема локальной SQLite-БД. Применяется при каждом initialize (CREATE IF NOT EXISTS — идемпотентно). */
export const LOCAL_DB_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS peer_devices (
  session_id    TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL,
  uin           TEXT,
  nickname      TEXT,
  username      TEXT,
  system_name   TEXT NOT NULL,
  device_nickname TEXT
);

CREATE TABLE IF NOT EXISTS chats (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending_key',
  peer_session_id TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS chats_peer_session_id_idx ON chats(peer_session_id);

CREATE TABLE IF NOT EXISTS messages (
  id                TEXT PRIMARY KEY,
  chat_id           TEXT NOT NULL,
  sender_session_id TEXT NOT NULL,
  content           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'sending',
  is_outgoing       INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS messages_chat_id_created_at_idx ON messages(chat_id, created_at);

CREATE TABLE IF NOT EXISTS chat_keys (
  chat_id                       TEXT PRIMARY KEY,
  encrypted_key                 TEXT NOT NULL DEFAULT '',
  key_iv                        TEXT NOT NULL DEFAULT '',
  encrypted_priv_key            TEXT,
  priv_key_iv                   TEXT,
  prev_encrypted_key            TEXT NOT NULL DEFAULT '',
  prev_key_iv                   TEXT NOT NULL DEFAULT '',
  my_ratchet_encrypted_priv_key TEXT,
  my_ratchet_priv_key_iv        TEXT,
  my_ratchet_pub_key            TEXT,
  peer_ratchet_pub_key          TEXT,
  created_at                    INTEGER NOT NULL
);
`.trim();

/**
 * Миграции колонок chat_keys для существующих БД.
 * Выполняются по одной с обработкой ошибок — ошибка «column already exists» игнорируется.
 * Порядок важен: более старые колонки первыми.
 */
export const LOCAL_DB_MIGRATIONS: readonly string[] = [
  "ALTER TABLE chat_keys ADD COLUMN encrypted_priv_key TEXT",
  "ALTER TABLE chat_keys ADD COLUMN priv_key_iv TEXT",
  "ALTER TABLE chat_keys ADD COLUMN prev_encrypted_key TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE chat_keys ADD COLUMN prev_key_iv TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE chat_keys ADD COLUMN my_ratchet_encrypted_priv_key TEXT",
  "ALTER TABLE chat_keys ADD COLUMN my_ratchet_priv_key_iv TEXT",
  "ALTER TABLE chat_keys ADD COLUMN my_ratchet_pub_key TEXT",
  "ALTER TABLE chat_keys ADD COLUMN peer_ratchet_pub_key TEXT",
];
