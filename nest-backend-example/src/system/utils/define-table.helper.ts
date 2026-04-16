import { mysqlTable, MySqlColumnBuilderBase } from 'drizzle-orm/mysql-core';

/** Маппинг: для каждого ключа Account должен быть MySqlColumnBuilderBase */
export type ColumnMapFromInterface<T> = {
  [K in keyof T]: MySqlColumnBuilderBase;
};

/** Обёртка над mysqlTable */
export const defineTableWithSchema = <TableInterfaceOne>(
  tableName: string,
  columns: ColumnMapFromInterface<TableInterfaceOne>,
) => {
  return mysqlTable(tableName, columns);
};
