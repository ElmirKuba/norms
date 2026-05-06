import { customType } from 'drizzle-orm/pg-core';

/** Регистронезависимый строковый тип PostgreSQL (требует расширения citext). */
export const citext = customType<{ data: string }>({
  dataType: (): string => 'citext',
});

/** Бинарный тип PostgreSQL для хранения зашифрованных данных. */
export const bytea = customType<{ data: Buffer }>({
  dataType: (): string => 'bytea',
});
