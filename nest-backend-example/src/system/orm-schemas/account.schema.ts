import { defineTableWithSchema } from '../utils/define-table.helper';
import { IAccountFull } from '../../interfaces/full/account/account-full.interface';
import { varchar } from 'drizzle-orm/mysql-core';

/** Схема таблицы аккаунтов */
export const accountSchema = defineTableWithSchema<IAccountFull>('accounts', {
  id: varchar('id', { length: 50 }).primaryKey().notNull(),
  login: varchar('login', { length: 20 }).notNull(),
  password: varchar('password', { length: 60 }).notNull(),
});
