import { ManagerResult } from './manager-result.interface';
import { IPayloadForTokens } from './payload-for-tokens.interface';

/** Результаты валидации JWT токена */
export interface IValidateToken
  extends Pick<
    ManagerResult,
    'error' | 'errorCode' | 'successMessages' | 'errorMessages'
  > {
  /** Данные валидации JWT токена */
  data:
    | (Partial<{
        iat: number;
        exp: number;
      }> &
        IPayloadForTokens)
    | null;
}
