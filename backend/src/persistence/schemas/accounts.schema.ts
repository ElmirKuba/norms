import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const accounts = pgTable('accounts', {
  // Уникальный ID аккаунта — формат {uuid-v7}_{unix-ms}
  id: text('id').primaryKey(),
  // Опциональный юзернейм (без учёта регистра, CITEXT в продакшне). Выдаётся только администратором
  username: text('username'),
  // Хеш пароля — алгоритм Argon2id
  passwordHash: text('password_hash').notNull(),
  // Оставшееся количество инвайт-кодов, которые может сгенерировать аккаунт
  invitesRemaining: integer('invites_remaining').notNull().default(3),
  // Флаг администратора — устанавливается только напрямую в БД, без API
  isAdmin: boolean('is_admin').notNull().default(false),
  // Дата и время создания аккаунта
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  // Дата и время последнего обновления — обновляется при каждой ротации токена (~каждые 15 с при активном WSS)
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
