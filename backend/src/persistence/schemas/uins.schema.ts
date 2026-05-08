import { pgTable, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.schema';
import type { SchemaColumnMap } from './define-table.helper';

/** Строка таблицы uins — контролирует полноту колонок в devtime. */
interface IUinRow {
  /** Уникальный ID записи UIN — формат {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  /** FK → accounts.id (nullable: UIN может быть не назначен аккаунту). */
  readonly accountId: unknown;
  /** Числовой UIN от 4 до 10 цифр, хранится как text. */
  readonly number: unknown;
  /** Флаг премиального UIN — возвращается в пул при удалении аккаунта. */
  readonly isPremium: unknown;
  /** Дата и время назначения UIN аккаунту. */
  readonly createdAt: unknown;
  /** Дата и время последнего обновления. */
  readonly updatedAt: unknown;
}

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const uins = pgTable('uins', {
  id: text('id').primaryKey(),
  accountId: text('account_id').references((): AnyPgColumn => accounts.id, { onDelete: 'no action' }),
  number: text('number').notNull().unique(),
  isPremium: boolean('is_premium').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IUinRow>, (t) => [
  uniqueIndex('uins_account_id_unique')
    .on(t.accountId)
    .where(sql`${t.accountId} IS NOT NULL`),
]);
