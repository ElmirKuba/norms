import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const invites = pgTable('invites', {
  // Уникальный ID инвайта — формат {uuid-v7}_{unix-ms}
  id: text('id').primaryKey(),
  // FK → accounts.id. При удалении аккаунта его инвайты каскадно удаляются
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  // 10-значный уникальный код приглашения
  code: text('code').notNull().unique(),
  // Срок действия кода
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  // Дата и время создания инвайта
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('invites_account_id_idx').on(t.accountId),
]);
