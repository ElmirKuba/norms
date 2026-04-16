import type { Request } from 'express';
import { IPairTokens } from './pair-tokens.interface';
import { IValidateToken } from './validate-token.interface';

/** Express.js Request с куками */
export type ReqWithCookies = Request &
  Partial<{
    /** Интерфейс пары JWT токенов */
    cookies: IPairTokens;
    /** Результаты валидации JWT токена */
    authData: IValidateToken['data'];
  }>;
