/** Интерфейс адаптации данных от репозитория */
export interface AdapterResultRepo<AdaptType = Record<string, unknown>> {
  /** Признак наличия или отсутствия ошибки работы репозитория с самой СуБД MySQL */
  error: boolean;
  /** Непосредственно результат работы репозитория работы с СуБД MySQL */
  adaptData: AdaptType;
}
