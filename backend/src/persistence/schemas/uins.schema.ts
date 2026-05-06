import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const uins = pgTable('uins', {
  // Уникальный ID записи UIN — формат {uuid-v7}_{unix-ms}
  id: text('id').primaryKey(),
  // FK → accounts.id. ON DELETE NO ACTION — логика переназначения на уровне приложения
  accountId: text('account_id').references((): AnyPgColumn => accounts.id, { onDelete: 'no action' }),
  // Числовой UIN от 4 до 10 цифр, глобально уникален
  number: integer('number').notNull().unique(),
  // Флаг премиального UIN — красивые или зарезервированные номера, выданные администратором заранее
  isPremium: boolean('is_premium').notNull().default(false),
  // Дата и время назначения UIN аккаунту
  ts: timestamp('ts', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
