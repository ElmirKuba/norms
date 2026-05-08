import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.schema';
import type { SchemaColumnMap } from './define-table.helper';

/** Форма строки таблицы recovery_questions для devtime-контроля SchemaColumnMap. */
interface IRecoveryQuestionRow {
  /** PK — {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  /** FK → accounts.id. */
  readonly accountId: unknown;
  /** Текст вопроса (открыто). */
  readonly question: unknown;
  /** Argon2id-хеш нормализованного ответа. */
  readonly answerHash: unknown;
  /** Дата создания. */
  readonly createdAt: unknown;
  /** Дата последнего обновления. */
  readonly updatedAt: unknown;
}

// Комментарии к колонкам — см. docker/sql-files/comments.sql
export const recoveryQuestions = pgTable('recovery_questions', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answerHash: text('answer_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IRecoveryQuestionRow>, (t) => [
  index('recovery_questions_account_id_idx').on(t.accountId),
]);
