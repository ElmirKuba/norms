/** Интерфейс запроса чтения из репозитория СуБД */
export interface ReadQueryAdapter<ResultType = Record<string, unknown>> {
  /** Наименование колонки */
  columnName: keyof ResultType;
  /** Какое значение предполагается у колонки */
  columnValue: string;
}
