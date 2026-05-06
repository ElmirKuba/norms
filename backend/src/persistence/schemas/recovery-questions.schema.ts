import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const recoveryQuestions = pgTable('recovery_questions', {
  // Уникальный ID вопроса — формат {uuid-v7}_{unix-ms}
  id: text('id').primaryKey(),
  // FK → accounts.id. При удалении аккаунта вопросы каскадно удаляются
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  // Текст вопроса (открытый, пресет или пользовательский)
  question: text('question').notNull(),
  // Хеш ответа — алгоритм Argon2id (соль внутри хеша)
  answerHash: text('answer_hash').notNull(),
  // Дата и время создания вопроса
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Дата и время последнего обновления
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('recovery_questions_account_id_idx').on(t.accountId),
]);
