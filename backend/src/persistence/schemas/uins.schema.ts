import { pgTable, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.schema';

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const uins = pgTable('uins', {
  // Уникальный ID записи UIN — формат {uuid-v7}_{unix-ms}
  id: text('id').primaryKey(),
  // FK → accounts.id. ON DELETE NO ACTION — логика переназначения на уровне приложения
  accountId: text('account_id').references((): AnyPgColumn => accounts.id, { onDelete: 'no action' }),
  // Числовой UIN от 4 до 10 цифр, глобально уникален (хранится как text)
  number: text('number').notNull().unique(),
  // Флаг премиального UIN — красивые или зарезервированные номера, возвращаются в пул при удалении аккаунта
  isPremium: boolean('is_premium').notNull().default(false),
  // Дата и время назначения UIN аккаунту
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Дата и время последнего обновления
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Partial unique: один UIN на аккаунт, NULL допускается несколько раз (незанятые UIN)
  uniqueIndex('uins_account_id_unique')
    .on(t.accountId)
    .where(sql`${t.accountId} IS NOT NULL`),
]);
