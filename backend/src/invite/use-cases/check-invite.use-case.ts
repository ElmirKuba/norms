import { Injectable, Inject, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InviteRepository } from '../../domain/ports/invite.repository.port';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { ErrorCode, makeError } from '../../common/errors/error-codes';

/** Форма ответа метода execute. */
interface CheckInviteResult {
  /** ISO-8601 дата истечения кода. */
  readonly expires_at: string;
}

/** Use-case проверки инвайт-кода без его потребления. */
@Injectable()
export class CheckInviteUseCase {
  /** Максимальное количество проверок на IP за окно. */
  private static readonly _maxAttempts: number = 10;
  /** Длина окна rate-limit в секундах (15 минут). */
  private static readonly _windowSec: number = 900;

  public constructor(
    private readonly _inviteRepo: InviteRepository,
    @Inject(REDIS_CLIENT) private readonly _redis: Redis,
  ) {}

  /**
   * Проверяет валидность инвайт-кода с rate-limiting по IP.
   * @param code - 10-значный код приглашения.
   * @param ip - IP-адрес клиента для rate-limiting.
   * @returns expires_at кода в ISO-8601 формате.
   * @throws HttpException 429 если превышен лимит запросов с IP.
   * @throws NotFoundException если код не найден или уже истёк.
   */
  public async execute(code: string, ip: string): Promise<CheckInviteResult> {
    await this._enforceRateLimit(ip);

    const invite = await this._inviteRepo.findByCode(code);
    // Намеренно одна ошибка для not_found И expired — предотвращает перебор активных кодов.
    if (invite === null || invite.expiresAt < new Date()) {
      throw new NotFoundException(makeError(ErrorCode.INVITE_NOT_FOUND));
    }

    return { expires_at: invite.expiresAt.toISOString() };
  }

  /**
   * Инкрементирует счётчик запросов для IP и бросает 429 если лимит превышен.
   * @param ip - IP-адрес клиента.
   * @throws HttpException 429 если лимит превышен.
   */
  private async _enforceRateLimit(ip: string): Promise<void> {
    const key = `invite:check:ip:${ip}`;
    const count = await this._redis.incr(key);
    if (count === 1) {
      await this._redis.expire(key, CheckInviteUseCase._windowSec);
    }
    if (count > CheckInviteUseCase._maxAttempts) {
      throw new HttpException(
        makeError(ErrorCode.RATE_LIMITED),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
