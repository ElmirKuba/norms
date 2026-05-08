import { Injectable, NotFoundException, UnauthorizedException, HttpException, HttpStatus, Inject } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { Redis } from 'ioredis';
import { RecoveryQuestionRepository } from '../../domain/ports/recovery-question.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import type { CheckAnswerDto } from '../dto/check-answer.dto';

/** TTL одноразового reset_token в секундах (10 минут). */
const RESET_TOKEN_TTL_SEC = 600;

/** Порог неудачных попыток до блокировки. */
const FAIL_THRESHOLD = 5;

/** Длительности блокировок по уровням (в секундах): 1ч, 24ч, 7д. */
const LOCK_DURATIONS_SEC: [number, number, number] = [3600, 86400, 604800];

/** Форма ответа use-case. */
interface CheckAnswerResult {
  /** Одноразовый reset_token (base64url, 32 байта). */
  readonly reset_token: string;
  /** ISO-дата истечения токена. */
  readonly expires_at: string;
}

/**
 * Нормализует ответ перед проверкой: trim → lowercase → collapse spaces → NFC.
 * @param answer - Ответ пользователя.
 * @returns Нормализованная строка.
 */
function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC');
}

/** Use-case проверки ответа на секретный вопрос с эскалирующим rate-limit. */
@Injectable()
export class CheckAnswerUseCase {
  public constructor(
    private readonly _recoveryRepo: RecoveryQuestionRepository,
    @Inject(REDIS_CLIENT) private readonly _redis: Redis,
  ) {}

  /**
   * Проверяет ответ. При успехе выдаёт reset_token, при неудаче инкрементирует счётчик.
   * @param dto - account_id, question_id, answer.
   * @returns { reset_token, expires_at }.
   * @throws HttpException 423 если аккаунт заблокирован.
   * @throws NotFoundException если вопрос не найден для данного аккаунта.
   * @throws UnauthorizedException если ответ неверен.
   */
  public async execute(dto: CheckAnswerDto): Promise<CheckAnswerResult> {
    const countKey = `recovery_fail_count:${dto.account_id}`;
    const levelKey = `recovery_fail_level:${dto.account_id}`;

    await this._checkRateLimit(countKey);

    const question = await this._recoveryRepo.findById(dto.question_id);
    if (question?.accountId !== dto.account_id) {
      throw new NotFoundException(makeError(ErrorCode.RECOVERY_QUESTION_NOT_FOUND));
    }

    const isCorrect = await argon2.verify(question.answerHash, normalizeAnswer(dto.answer));
    if (!isCorrect) {
      await this._handleFailure(countKey, levelKey);
      throw new UnauthorizedException(makeError(ErrorCode.WRONG_ANSWER));
    }

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SEC * 1000);
    await this._redis.set(`reset_token:${rawToken}`, dto.account_id, 'EX', RESET_TOKEN_TTL_SEC);

    return { reset_token: rawToken, expires_at: expiresAt.toISOString() };
  }

  /**
   * Проверяет счётчик — если >= порога, блокирует с retry_after.
   * @param countKey - Redis-ключ счётчика.
   * @throws HttpException 423 если лимит превышен.
   */
  private async _checkRateLimit(countKey: string): Promise<void> {
    const raw = await this._redis.get(countKey);
    if (raw === null) {
      return;
    }
    const count = parseInt(raw, 10);
    if (count >= FAIL_THRESHOLD) {
      const ttl = await this._redis.ttl(countKey);
      const retryAfter = new Date(Date.now() + ttl * 1000).toISOString();
      throw new HttpException(
        { ...makeError(ErrorCode.RECOVERY_RATE_LIMITED), retry_after: retryAfter },
        HttpStatus.LOCKED,
      );
    }
  }

  /**
   * Инкрементирует счётчик неудач с эскалирующим TTL.
   * Уровни: 5 неудач → 1ч, ещё 5 → 24ч, ещё 5 → 7д.
   * @param countKey - Redis-ключ счётчика.
   * @param levelKey - Redis-ключ уровня блокировки.
   */
  private async _handleFailure(countKey: string, levelKey: string): Promise<void> {
    const count = await this._redis.incr(countKey);

    if (count === 1) {
      // Первая неудача — начинаем окно 10 минут
      await this._redis.expire(countKey, 600);
      return;
    }

    if (count >= FAIL_THRESHOLD) {
      // Достигли порога — эскалируем блокировку
      const rawLevel = await this._redis.get(levelKey);
      const currentLevel = rawLevel !== null ? parseInt(rawLevel, 10) : 0;
      const newLevel = Math.min(currentLevel + 1, LOCK_DURATIONS_SEC.length);
      const lockSec = LOCK_DURATIONS_SEC[newLevel - 1] ?? LOCK_DURATIONS_SEC[2];
      const maxLockSec = LOCK_DURATIONS_SEC[2];

      await this._redis.setex(levelKey, maxLockSec, String(newLevel));
      await this._redis.expire(countKey, lockSec);
    }
  }
}
