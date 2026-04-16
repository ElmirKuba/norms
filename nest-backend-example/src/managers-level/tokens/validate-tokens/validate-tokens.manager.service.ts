import { Injectable } from '@nestjs/common';
import { IValidateToken } from '../../../interfaces/systems/validate-token.interface';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import * as jsonwebtoken from 'jsonwebtoken';
import { IPayloadForTokens } from '../../../interfaces/systems/payload-for-tokens.interface';

/** Сервис модуля бизнес логики уровня Manager связанных с валидацией токенов */
@Injectable()
export class ValidateTokensManagerService {
  /**
   * Метод валидации JWT токена
   * @param {string} token - токен переданный на метод для валидации
   * @param {'refreshToken' | 'accessToken'} type - Тип переданного на метод токена для валидации
   * @returns {} - Результат работы валидатора
   * @public
   * */
  validateAnyToken(
    token: string,
    type: 'refreshToken' | 'accessToken',
  ): IValidateToken {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    /** Секрет для создания Access токена доступа пользователя в систему */
    const accessKey = process.env['ACCESS_KEY_JWT'];
    /** Секрет для создания JWT токена обновления пары JWT токенов */
    const refreshKey = process.env['REFRESH_KEY_JWT'];

    if (!accessKey || !refreshKey) {
      throw new Error('ACCESS_KEY_JWT or REFRESH_KEY_JWT is not defined');
    }

    try {
      /** Данные расшировки токена */
      const validateData = jsonwebtoken.verify(
        token,
        type === 'refreshToken' ? refreshKey : accessKey,
      ) as IPayloadForTokens;

      successMessages.push(
        `Токен типа "${type}" успешно провалидирован и является корректным`,
      );

      return {
        error: false,
        errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
        errorMessages,
        successMessages,
        data: validateData,
      };
    } catch (err) {
      errorMessages.push((err as { message: string }).message);

      return {
        error: true,
        errorCode: EnumerationErrorCodes.ERROR_CODE_INTERNAL_ERROR,
        errorMessages,
        successMessages,
        data: null,
      };
    }
  }
}
