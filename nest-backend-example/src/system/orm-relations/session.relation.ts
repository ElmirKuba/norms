import { relations } from 'drizzle-orm';
import { sessionSchema } from '../orm-schemas/session.schema';
import { accountSchema } from '../orm-schemas/account.schema';

/** Связь: одна сессия может иметь один аккаунт */
export const sessionRelations = relations(sessionSchema, (params) => {
  return {
    account: params.one(accountSchema, {
      fields: [sessionSchema.accountId],
      references: [accountSchema.id],
    }),
  };
});
