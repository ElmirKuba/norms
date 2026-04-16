import {
  mysqlTable,
  varchar,
  text,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';
import { accountSchema } from './account.schema';
import { InferSelectModel } from 'drizzle-orm';

/** Схема таблицы сессий аккаунта */
export const sessionSchema = mysqlTable(
  'sessions',
  {
    id: varchar('id', { length: 50 }).primaryKey().notNull(),
    accountId: varchar('account_id', { length: 50 })
      .notNull()
      .references(() => {
        return accountSchema.id;
      }),
    refreshToken: text('refresh_token').notNull(),
    ua: varchar('ua', { length: 512 }).notNull(),
    ip: varchar('ip', { length: 45 }).notNull(),
    browserData: text('browser_data'),
    cpuArchitecture: text('cpu_architecture'),
    deviceData: text('device_data'),
    osData: text('os_data'),
  },
  (table) => [
    uniqueIndex('uq_session_account_ip_ua').on(
      table.accountId,
      table.ip,
      table.ua,
    ),
  ],
);

/** Тип схемы сессий */
export type SessionEntity = InferSelectModel<typeof sessionSchema>;
