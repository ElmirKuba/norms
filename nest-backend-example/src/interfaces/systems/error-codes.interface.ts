/** Перечисление ошибок работы систем бизнес-логики */
export enum EnumerationErrorCodes {
  /** Ошибка: Уже существующее действие */
  ERROR_CODE_ALREADY_EXISTS = 'ERROR_CODE_ALREADY_EXISTS',
  /** Ошибка: Действие не существует */
  ERROR_CODE_NOT_EXISTS = 'ERROR_CODE_NOT_EXISTS',
  /** Ошибка: Действие не подходит */
  ERROR_CODE_IS_INCORRECT = 'ERROR_CODE_IS_INCORRECT',
  /** Код для прочей ошибки */
  ERROR_CODE_INTERNAL_ERROR = 'ERROR_CODE_INTERNAL_ERROR',
  /** Код для отсутствия ошибки */
  ERROR_CODE_NULL = 'ERROR_CODE_NULL',
}
