import { pgTable, text, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { sessions } from './sessions.schema';
import { chatStatusEnum } from './enums';
import { citext } from './custom-types';
import type { SchemaColumnMap } from './define-table.helper';

/** Строка таблицы chats — контролирует полноту колонок в devtime. */
interface IChatRow {
  /** Уникальный ID чата — формат {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  /** Название чата (не шифруется, citext — CI-уникальность в паре). */
  readonly name: unknown;
  /** FK → sessions.id — min(id) из пары устройств. ON DELETE CASCADE. */
  readonly sessionAId: unknown;
  /** FK → sessions.id — max(id) из пары устройств. ON DELETE CASCADE. */
  readonly sessionBId: unknown;
  /** FK → sessions.id — кто инициировал создание чата. ON DELETE SET NULL. */
  readonly createdBySessionId: unknown;
  /** Статус обмена ключами: pending_key → active. */
  readonly status: unknown;
  /** X25519 публичный ключ session_a (base64). NULL после завершения обмена. */
  readonly publicKeyA: unknown;
  /** X25519 публичный ключ session_b (base64). NULL после завершения обмена. */
  readonly publicKeyB: unknown;
  /** Дата и время создания чата. */
  readonly createdAt: unknown;
  /** Дата и время последнего обновления. */
  readonly updatedAt: unknown;
}

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const chats = pgTable('chats', {
  id: text('id').primaryKey(),
  name: citext('name').notNull(),
  sessionAId: text('session_a_id')
    .notNull()
    .references((): AnyPgColumn => sessions.id, { onDelete: 'cascade' }),
  sessionBId: text('session_b_id')
    .notNull()
    .references((): AnyPgColumn => sessions.id, { onDelete: 'cascade' }),
  createdBySessionId: text('created_by_session_id')
    .references((): AnyPgColumn => sessions.id, { onDelete: 'set null' }),
  status: chatStatusEnum('status').notNull().default('pending_key'),
  publicKeyA: text('public_key_a'),
  publicKeyB: text('public_key_b'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IChatRow>, (t) => [
  check('chats_session_order_check', sql`${t.sessionAId} < ${t.sessionBId}`),
  uniqueIndex('chats_pair_name_unique').on(t.sessionAId, t.sessionBId, t.name),
  index('chats_session_a_id_idx').on(t.sessionAId),
  index('chats_session_b_id_idx').on(t.sessionBId),
]);
