import { UseCaseResult } from '../systems/use-case-result.interface';

/** Интерфейс ответа от API */
export type ApiResult<ResultType = Record<string, unknown>> = Pick<
  UseCaseResult<ResultType>,
  'error' | 'successMessages' | 'errorMessages' | 'data'
>;
