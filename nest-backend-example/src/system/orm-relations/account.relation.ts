import { relations } from 'drizzle-orm';
import { accountSchema } from '../orm-schemas/account.schema';
import { sessionSchema } from '../orm-schemas/session.schema';

/** Связь: один аккаунт может иметь много сессий */
export const accountsRelations = relations(accountSchema, (params) => {
  return {
    session: params.many(sessionSchema),
  };
});
