import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import * as argon2 from 'argon2';
import { Redis } from 'ioredis';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import { WssConnectionStore } from '../../wss/wss-connection.store';
import type { AccountEntity } from '../../domain/entities/account.entity';
import type { Platform } from '../../common/types/platform.type';
import { generateRefreshToken } from '../../common/utils/crypto.util';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import type { AuthAccountDto } from '../dto/auth-account.dto';

/** Форма ответа метода execute. */
interface AuthAccountResult {
  /** Данные аккаунта. */
  readonly account: {
    /** ID аккаунта. */
    readonly id: string;
    /** UIN или null. */
    readonly uin: string | null;
    /** Юзернейм или null. */
    readonly username: string | null;
    /** Количество оставшихся инвайтов. */
    readonly invites_remaining: number;
  };
  /** Данные новой сессии с токенами. */
  readonly session: {
    /** ID сессии. */
    readonly id: string;
    /** Системное имя устройства. */
    readonly system_name: string;
    /** Платформа. */
    readonly platform: Platform;
    /** JWT access-токен. */
    readonly access_token: string;
    /** Opaque refresh-токен. */
    readonly refresh_token: string;
  };
}

/** Use-case авторизации: логин по UIN или username + пароль. */
@Injectable()
export class AuthAccountUseCase {
  public constructor(
    private readonly _accountRepo: AccountRepository,
    private readonly _sessionRepo: SessionRepository,
    private readonly _jwtService: JwtService,
    private readonly _config: ConfigService,
    private readonly _wss: WssConnectionStore,
    @Inject(REDIS_CLIENT) private readonly _redis: Redis,
  ) {}

  /**
   * Авторизует пользователя и создаёт новую сессию.
   * @param dto - Данные для входа.
   * @returns Данные аккаунта и сессии с токенами.
   * @throws HttpException 423 если превышен лимит неудачных попыток.
   * @throws UnauthorizedException если логин/пароль не совпадают.
   * @throws ForbiddenException если достигнут лимит устройств.
   */
  public async execute(dto: AuthAccountDto): Promise<AuthAccountResult> {
    const loginKey = `auth:fail:${dto.login.toLowerCase()}`;
    const failThreshold = parseInt(this._config.get<string>('AUTH_FAIL_LIMIT', '5'), 10);
    const failWindowSec = parseInt(this._config.get<string>('AUTH_FAIL_WINDOW_SEC', '900'), 10);

    await this._checkRateLimit(loginKey, failThreshold);

    const account = await this._findAccount(dto.login);
    if (account === null) {
      await this._incrementFailCounter(loginKey, failWindowSec);
      throw new UnauthorizedException(makeError(ErrorCode.INVALID_CREDENTIALS));
    }

    const passwordValid = await argon2.verify(account.passwordHash, dto.password);
    if (!passwordValid) {
      await this._incrementFailCounter(loginKey, failWindowSec);
      throw new UnauthorizedException(makeError(ErrorCode.INVALID_CREDENTIALS));
    }

    const deviceLimit = parseInt(this._config.get<string>('DEVICE_LIMIT', '20'), 10);
    const sessionCount = await this._sessionRepo.countByAccountId(account.id);
    if (sessionCount >= deviceLimit) {
      throw new ForbiddenException(makeError(ErrorCode.DEVICE_LIMIT_REACHED));
    }

    await this._redis.del(
      loginKey,
      `recovery_fail_count:${account.id}`,
      `recovery_fail_level:${account.id}`,
    );

    const { raw: rawRefresh, hash: refreshHash } = generateRefreshToken();
    const session = await this._sessionRepo.create({
      accountId: account.id,
      systemName: dto.system_name,
      platform: dto.platform,
      refreshTokenHash: refreshHash,
    });

    const uin = await this._accountRepo.findUinByAccountId(account.id);
    const accessToken = await this._jwtService.signAsync({
      sub: account.id,
      sessionId: session.id,
      platform: session.platform,
      isAdmin: account.isAdmin,
    });

    this._wss.sendToAccount(account.id, 'session_created', {
      session_id: session.id,
      system_name: session.systemName,
      platform: session.platform,
      at: new Date().toISOString(),
    });

    // TODO: отправить push-уведомление на все существующие сессии аккаунта (кроме новой).
    // Текст: "Выполнен вход на новом устройстве. Если это были не вы — кикните сессию."
    // Платформы: APNs (iOS/iPadOS) и FCM (Android). Electron — только WSS (норм для десктопа).
    // Реализация: PushService.sendSessionCreated(accountId, excludeSessionId: session.id).
    // Зависит от: POST /api/v1/push/register-token, sessions.push_token/push_provider.
    // См. docs/push-notifications.md.

    return {
      account: {
        id: account.id,
        uin,
        username: account.username,
        invites_remaining: account.invitesRemaining,
      },
      session: {
        id: session.id,
        system_name: session.systemName,
        platform: session.platform,
        access_token: accessToken,
        refresh_token: rawRefresh,
      },
    };
  }

  /**
   * Проверяет, не превышен ли лимит неудачных попыток для данного логина.
   * @param key - Redis-ключ счётчика.
   * @param threshold - Максимальное допустимое количество неудач.
   * @throws HttpException 423 если лимит превышен, с полем retry_after.
   */
  private async _checkRateLimit(key: string, threshold: number): Promise<void> {
    const raw = await this._redis.get(key);
    if (raw === null) {
      return;
    }
    const count = parseInt(raw, 10);
    if (count >= threshold) {
      const ttl = await this._redis.ttl(key);
      const retryAfter = new Date(Date.now() + ttl * 1000).toISOString();
      throw new HttpException(
        { ...makeError(ErrorCode.LOGIN_RATE_LIMITED), retry_after: retryAfter },
        HttpStatus.LOCKED,
      );
    }
  }

  /**
   * Инкрементирует счётчик неудачных попыток, выставляя TTL при первом инкременте.
   * @param key - Redis-ключ счётчика.
   * @param windowSec - TTL окна в секундах.
   */
  private async _incrementFailCounter(key: string, windowSec: number): Promise<void> {
    const count = await this._redis.incr(key);
    if (count === 1) {
      await this._redis.expire(key, windowSec);
    }
  }

  /**
   * Находит аккаунт по логину — если логин состоит только из цифр, ищет по UIN, иначе по username.
   * @param login - Строка логина из запроса.
   * @returns Сущность аккаунта или null.
   */
  private async _findAccount(login: string): Promise<AccountEntity | null> {
    if (/^\d+$/.test(login)) {
      return this._accountRepo.findByUin(login);
    }
    return this._accountRepo.findByUsername(login);
  }
}
