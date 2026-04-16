import { ISessionFull } from '../full/session/session-full.interface';
import { EnumerationErrorCodes } from './error-codes.interface';

/** Результат работы логики уровня Manager */
export interface ManagerResult<ResultType = Record<string, unknown>> {
  /** Признак наличия или отсутствия ошибки работы системы с репозиторием */
  error: boolean;
  /** Код ошибки при наличии */
  errorCode: EnumerationErrorCodes;
  /** Массив сообщений ошибок */
  errorMessages: string[];
  /** Массив сообщений успеха */
  successMessages: string[];
  /** Непосредственно результат работы системы */
  data: ResultType;
}

/** Результаты метода завершения всех прочих сессий кроме текущий для метода завершения всех прочих сессий бизнес логики уровня manager */
export interface EndOfSessions {
  /** Массив сессий завершенных успешно */
  sessionArraySuccess: ISessionFull[];
  /** Массив сессий которые не получилось завершить */
  sessionArrayError: ISessionFull[];
}
