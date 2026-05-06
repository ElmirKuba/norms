import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  username: text('username'),
  passwordHash: text('password_hash').notNull(),
  invitesRemaining: integer('invites_remaining').notNull().default(3),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
