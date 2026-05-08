import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Redis } from 'ioredis';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import { WssConnectionStore } from '../../wss/wss-connection.store';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import type { ResetPasswordDto } from '../dto/reset-password.dto';

/** Use-case сброса пароля по одноразовому reset_token. */
@Injectable()
export class ResetPasswordUseCase {
  public constructor(
    private readonly _accountRepo: AccountRepository,
    private readonly _wss: WssConnectionStore,
    @Inject(REDIS_CLIENT) private readonly _redis: Redis,
  ) {}

  /**
   * Меняет пароль аккаунта по reset_token. Токен одноразовый — удаляется после использования.
   * Всем активным сессиям аккаунта отправляется WSS password_reset_via_recovery.
   * @param dto - reset_token и новый пароль.
   * @throws UnauthorizedException если токен недействителен или истёк.
   */
  public async execute(dto: ResetPasswordDto): Promise<void> {
    const tokenKey = `reset_token:${dto.reset_token}`;
    const accountId = await this._redis.get(tokenKey);

    if (accountId === null) {
      throw new UnauthorizedException(makeError(ErrorCode.RESET_TOKEN_INVALID));
    }

    await this._redis.del(tokenKey);

    const passwordHash = await argon2.hash(dto.new_password);
    await this._accountRepo.updatePassword(accountId, passwordHash);

    this._wss.sendToAccount(accountId, 'password_reset_via_recovery', {
      at: new Date().toISOString(),
    });
  }
}
