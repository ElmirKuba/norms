import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';
import type { SchemaColumnMap } from './define-table.helper';

/** Строка таблицы invites — контролирует полноту колонок в devtime. */
interface IInviteRow {
  /** Уникальный ID инвайта — формат {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  /** FK → accounts.id. */
  readonly accountId: unknown;
  /** 10-значный уникальный код приглашения. */
  readonly code: unknown;
  /** Срок действия кода. */
  readonly expiresAt: unknown;
  /** Дата и время создания инвайта. */
  readonly createdAt: unknown;
}

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IInviteRow>, (t) => [
  index('invites_account_id_idx').on(t.accountId),
]);
