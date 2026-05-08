import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';
import { platformEnum } from './enums';
import type { SchemaColumnMap } from './define-table.helper';

/** Строка таблицы sessions — контролирует полноту колонок в devtime. */
interface ISessionRow {
  /** Уникальный ID сессии — формат {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  /** FK → accounts.id. */
  readonly accountId: unknown;
  /** Системное имя устройства. */
  readonly systemName: unknown;
  /** Платформа устройства. */
  readonly platform: unknown;
  /** Прозвище устройства или null. */
  readonly nickname: unknown;
  /** SHA-256 hex-хеш refresh-токена. */
  readonly refreshTokenHash: unknown;
  /** Дата и время создания сессии. */
  readonly createdAt: unknown;
  /** Дата и время последней активности. */
  readonly updatedAt: unknown;
}

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  systemName: text('system_name').notNull(),
  platform: platformEnum('platform').notNull(),
  nickname: text('nickname'),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<ISessionRow>, (t) => [
  index('sessions_account_id_idx').on(t.accountId),
]);
