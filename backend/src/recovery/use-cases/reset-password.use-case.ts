import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Redis } from 'ioredis';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import type { ResetPasswordDto } from '../dto/reset-password.dto';

/** Use-case сброса пароля по одноразовому reset_token. */
@Injectable()
export class ResetPasswordUseCase {
  public constructor(
    private readonly _accountRepo: AccountRepository,
    @Inject(REDIS_CLIENT) private readonly _redis: Redis,
  ) {}

  /**
   * Меняет пароль аккаунта по reset_token. Токен одноразовый — удаляется после использования.
   * После смены пароля все активные сессии аккаунта получат WSS-уведомление
   * `password_reset_via_recovery` (TODO: реализовать при добавлении WSS-gateway в шаге 7).
   * @param dto - reset_token и новый пароль.
   * @throws UnauthorizedException если токен недействителен или истёк.
   */
  public async execute(dto: ResetPasswordDto): Promise<void> {
    const tokenKey = `reset_token:${dto.reset_token}`;
    const accountId = await this._redis.get(tokenKey);

    if (accountId === null) {
      throw new UnauthorizedException(makeError(ErrorCode.RESET_TOKEN_INVALID));
    }

    // Атомарно инвалидируем токен перед обновлением пароля
    await this._redis.del(tokenKey);

    const passwordHash = await argon2.hash(dto.new_password);
    await this._accountRepo.updatePassword(accountId, passwordHash);

    // TODO (шаг 7): отправить WSS `password_reset_via_recovery` всем активным сессиям accountId
  }
}
