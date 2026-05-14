import { pgTable, text, timestamp, index, check } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { chats } from './chats.schema';
import { sessions } from './sessions.schema';
import { bytea } from './custom-types';
import type { SchemaColumnMap } from './define-table.helper';

/** Строка таблицы pending_messages — контролирует полноту колонок в devtime. */
interface IPendingMessageRow {
  /** Уникальный ID сообщения — формат {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  /** FK → chats.id. ON DELETE CASCADE — сообщения живут только пока жив чат. */
  readonly chatId: unknown;
  /** FK → sessions.id — отправитель. ON DELETE CASCADE. */
  readonly senderSessionId: unknown;
  /** FK → sessions.id — получатель (для быстрой выборки при доставке). ON DELETE CASCADE. */
  readonly receiverSessionId: unknown;
  /** Зашифрованный blob: [iv: 12b][ciphertext][auth_tag: 16b]. Лимит 1MB. */
  readonly encryptedBlob: unknown;
  /** Дата и время создания сообщения. */
  readonly createdAt: unknown;
}

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const pendingMessages = pgTable('pending_messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references((): AnyPgColumn => chats.id, { onDelete: 'cascade' }),
  senderSessionId: text('sender_session_id')
    .notNull()
    .references((): AnyPgColumn => sessions.id, { onDelete: 'cascade' }),
  receiverSessionId: text('receiver_session_id')
    .notNull()
    .references((): AnyPgColumn => sessions.id, { onDelete: 'cascade' }),
  encryptedBlob: bytea('encrypted_blob').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IPendingMessageRow>, (t) => [
  check('pending_messages_blob_size_check', sql`octet_length(${t.encryptedBlob}) <= 1048576`),
  index('pending_messages_receiver_session_id_idx').on(t.receiverSessionId),
  index('pending_messages_chat_id_idx').on(t.chatId),
]);
