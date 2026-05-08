import type { PgColumnBuilderBase } from 'drizzle-orm/pg-core';

/**
 * Маппинг ключей интерфейса строки T на Drizzle-строители колонок.
 * Используется с оператором satisfies для devtime-контроля полноты схемы:
 * @example
 * export const accounts = pgTable('accounts', {
 *   id: text('id').primaryKey(),
 *   ...
 * } satisfies SchemaColumnMap<IAccountRow>);
 */
export type SchemaColumnMap<T> = { [K in keyof T]: PgColumnBuilderBase };
