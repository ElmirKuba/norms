import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';
import type { SchemaColumnMap } from './define-table.helper';

/** Строка таблицы referrals — контролирует полноту колонок в devtime. */
interface IReferralRow {
  /** Уникальный ID записи — формат {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  /** FK → accounts.id. SET NULL при удалении инвайтера. */
  readonly inviterId: unknown;
  /** FK → accounts.id. CASCADE при удалении приглашённого. */
  readonly inviteeId: unknown;
  /** Дата и время создания записи реферала. */
  readonly createdAt: unknown;
}

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const referrals = pgTable('referrals', {
  id: text('id').primaryKey(),
  inviterId: text('inviter_id')
    .references((): AnyPgColumn => accounts.id, { onDelete: 'set null' }),
  inviteeId: text('invitee_id')
    .notNull()
    .unique()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IReferralRow>, (t) => [
  index('referrals_inviter_id_idx').on(t.inviterId),
]);
