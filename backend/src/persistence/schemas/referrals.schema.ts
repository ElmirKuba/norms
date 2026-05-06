import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const referrals = pgTable('referrals', {
  // Уникальный ID записи — формат {uuid-v7}_{unix-ms}
  id: text('id').primaryKey(),
  // FK → accounts.id. SET NULL при удалении инвайтера — запись реферала сохраняется
  inviterId: text('inviter_id')
    .references((): AnyPgColumn => accounts.id, { onDelete: 'set null' }),
  // FK → accounts.id. CASCADE при удалении приглашённого — запись бессмысленна без него
  inviteeId: text('invitee_id')
    .notNull()
    .unique()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  // Дата и время создания записи реферала
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('referrals_inviter_id_idx').on(t.inviterId),
]);
