import { Injectable } from '@nestjs/common';
import { IPayloadForTokens } from '../../../interfaces/systems/payload-for-tokens.interface';
import * as jsonwebtoken from 'jsonwebtoken';
import { IPairTokens } from '../../../interfaces/systems/pair-tokens.interface';
import type { StringValue } from 'ms';

/** Сервис модуля бизнес логики уровня Manager связанных с генерацией токенов */
@Injectable()
export class GenerateTokensManagerService {
  /**
   * Метод генерации новой пары токенов JWT
   * @param {IPayloadForTokens} payload - Полезная нагрузка для генерации новой пары JWT токенов
   * @returns {IPairTokens} Новая пара токенов JWT
   * @public
   */
  public generatePairTokens(payload: IPayloadForTokens): IPairTokens {
    /** Новый сгенерированный JWT токен доступа к системам  */
    const accessToken = this.generateAccessToken({
      ...payload,
      tokenType: 'accessToken',
    });
    /** Новый сгенерированный JWT токен обновления пары токенов JWT */
    const refreshToken = this.generateRefreshToken({
      ...payload,
      tokenType: 'refreshToken',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Метод генерации JWT токена доступа к системам
   * @param {IPayloadForTokens} payload - Полезная нагрузка для генерации нового JWT токена доступа к системам
   * @returns {string} Новый сгенерированный токен доступа к системам
   * @public
   */
  generateAccessToken(payload: IPayloadForTokens): string {
    /** Секрет для создания Access токена доступа пользователя в систему */
    const accessKey = process.env['ACCESS_KEY_JWT'];
    /** Время жизни токена доступа пользователя в система */
    const lifetime = process.env['ACCESS_TOKEN_LIFETIME'];

    if (!accessKey) {
      throw new Error('ACCESS_KEY_JWT is not defined');
    }
    if (!lifetime) {
      throw new Error('ACCESS_TOKEN_LIFETIME is not defined');
    }

    return jsonwebtoken.sign(payload, accessKey, {
      expiresIn: lifetime as StringValue,
    });
  }

  /**
   * Метод генерации JWT токена обновления пары токенов JWT
   * @param {IPayloadForTokens} payload - Полезная нагрузка для генерации нового JWT токена обновления пары токенов JWT
   * @returns {string} Новый сгенерированный токен обновления пары токенов JWT
   * @public
   */
  generateRefreshToken(payload: IPayloadForTokens): string {
    /** Секрет для создания JWT токена обновления пары JWT токенов */
    const refreshKey = process.env['REFRESH_KEY_JWT'];
    /** Время жизни токена JWT токена обновления пары JWT токенов */
    const lifetime = process.env['REFRESH_TOKEN_LIFETIME'];

    if (!refreshKey) {
      throw new Error('REFRESH_KEY_JWT is not defined');
    }
    if (!lifetime) {
      throw new Error('REFRESH_TOKEN_LIFETIME is not defined');
    }

    return jsonwebtoken.sign(payload, refreshKey, {
      expiresIn: lifetime as StringValue,
    });
  }
}
