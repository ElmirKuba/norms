import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { citext } from './custom-types';
import type { SchemaColumnMap } from './define-table.helper';

/** Строка таблицы accounts — контролирует полноту колонок в devtime. */
interface IAccountRow {
  /** Уникальный ID аккаунта — формат {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  /** Хеш пароля (Argon2id). */
  readonly passwordHash: unknown;
  /** Опциональный юзернейм (CITEXT, без учёта регистра). */
  readonly username: unknown;
  /** Оставшееся количество инвайт-кодов. */
  readonly invitesRemaining: unknown;
  /** Флаг администратора. */
  readonly isAdmin: unknown;
  /** Дата и время создания аккаунта. */
  readonly createdAt: unknown;
  /** Дата и время последнего обновления. */
  readonly updatedAt: unknown;
}

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  username: citext('username').unique(),
  invitesRemaining: integer('invites_remaining').notNull().default(3),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IAccountRow>);
