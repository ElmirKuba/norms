import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';

export const uins = pgTable('uins', {
  id: text('id').primaryKey(),
  accountId: text('account_id').references((): AnyPgColumn => accounts.id, { onDelete: 'no action' }),
  number: integer('number').notNull().unique(),
  isPremium: boolean('is_premium').notNull().default(false),
  ts: timestamp('ts', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
