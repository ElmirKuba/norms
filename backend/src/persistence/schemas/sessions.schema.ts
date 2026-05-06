import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';
import { platformEnum } from './enums';

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const sessions = pgTable('sessions', {
  // Уникальный ID сессии — формат {uuid-v7}_{unix-ms}
  id: text('id').primaryKey(),
  // FK → accounts.id. При удалении аккаунта сессии каскадно удаляются
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  // Системное имя устройства (например «iPhone 14 Pro»)
  systemName: text('system_name').notNull(),
  // Платформа устройства
  platform: platformEnum('platform').notNull(),
  // Опциональное прозвище устройства, видимое другим пользователям
  nickname: text('nickname'),
  // SHA-256 hex хеш refresh-токена (64 символа)
  refreshTokenHash: text('refresh_token_hash').notNull(),
  // Дата и время создания сессии
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Дата и время последней активности
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('sessions_account_id_idx').on(t.accountId),
]);
