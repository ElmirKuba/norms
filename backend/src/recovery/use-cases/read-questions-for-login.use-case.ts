import { Injectable, NotFoundException, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import { RecoveryQuestionRepository } from '../../domain/ports/recovery-question.repository.port';
import type { PublicRecoveryQuestion } from '../../domain/ports/recovery-question.repository.port';
import type { AccountEntity } from '../../domain/entities/account.entity';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import { REDIS_CLIENT } from '../../redis/redis.constants';

/** Форма ответа use-case. */
interface ReadQuestionsForLoginResult {
  /** ID аккаунта (нужен для следующего шага check-answer). */
  readonly account_id: string;
  /** Список вопросов без хешей. */
  readonly questions: PublicRecoveryQuestion[];
}

/** Use-case получения вопросов восстановления для экрана «Забыл пароль» (публичный). */
@Injectable()
export class ReadQuestionsForLoginUseCase {
  public constructor(
    private readonly _accountRepo: AccountRepository,
    private readonly _recoveryRepo: RecoveryQuestionRepository,
    @Inject(REDIS_CLIENT) private readonly _redis: Redis,
  ) {}

  /**
   * Находит аккаунт по логину, проверяет rate-limit, возвращает список вопросов.
   * @param login - UIN или username.
   * @returns account_id и список вопросов без хешей.
   * @throws NotFoundException если аккаунт не найден или recovery не настроен.
   * @throws HttpException 423 если аккаунт заблокирован по rate-limit.
   */
  public async execute(login: string): Promise<ReadQuestionsForLoginResult> {
    const account = await this._findAccount(login);
    if (account === null) {
      throw new NotFoundException(makeError(ErrorCode.ACCOUNT_NOT_FOUND));
    }

    await this._checkRateLimit(account.id);

    const questions = await this._recoveryRepo.findPublicByAccountId(account.id);
    if (questions.length === 0) {
      throw new NotFoundException(makeError(ErrorCode.RECOVERY_NOT_CONFIGURED));
    }

    return { account_id: account.id, questions };
  }

  /**
   * Ищет аккаунт — по UIN (только цифры) или по username.
   * @param login - Строка логина.
   * @returns Сущность аккаунта или null.
   */
  private async _findAccount(login: string): Promise<AccountEntity | null> {
    if (/^\d+$/.test(login)) {
      return this._accountRepo.findByUin(login);
    }
    return this._accountRepo.findByUsername(login);
  }

  /**
   * Проверяет, не заблокирован ли аккаунт по recovery rate-limit.
   * @param accountId - ID аккаунта.
   * @throws HttpException 423 если лимит превышен.
   */
  private async _checkRateLimit(accountId: string): Promise<void> {
    const countKey = `recovery_fail_count:${accountId}`;
    const raw = await this._redis.get(countKey);
    if (raw === null) {
      return;
    }
    const count = parseInt(raw, 10);
    if (count >= 5) {
      const ttl = await this._redis.ttl(countKey);
      const retryAfter = new Date(Date.now() + ttl * 1000).toISOString();
      throw new HttpException(
        { ...makeError(ErrorCode.RECOVERY_RATE_LIMITED), retry_after: retryAfter },
        HttpStatus.LOCKED,
      );
    }
  }
}
