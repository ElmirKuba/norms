/** Результат работы репозитория по взаимодействию с СуБД MySQL */
export interface ResultQueryRepository<ResultType = Record<string, unknown>> {
  /** Признак наличия или отсутствия ошибки работы репозитория с самой СуБД MySQL */
  error: boolean;
  /** Непосредственно результат работы репозитория работы с СуБД MySQL */
  data: ResultType;
}
