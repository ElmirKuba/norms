import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../domain/ports/account.repository.port';

/** Форма ответа метода execute. */
interface UinStatusResult {
  /** Статус генерации UIN. */
  readonly status: 'pending' | 'assigned';
  /** Номер UIN или null если ещё не назначен. */
  readonly uin: string | null;
}

/** Use-case получения статуса готовности UIN для текущего аккаунта. */
@Injectable()
export class ReadUinStatusUseCase {
  public constructor(private readonly _accountRepo: AccountRepository) {}

  /**
   * Проверяет, назначен ли UIN аккаунту.
   * @param accountId - ID аккаунта из JWT.
   * @returns Статус ('pending' или 'assigned') и значение UIN.
   */
  public async execute(accountId: string): Promise<UinStatusResult> {
    const uin = await this._accountRepo.findUinByAccountId(accountId);
    if (uin === null) {
      return { status: 'pending', uin: null };
    }
    return { status: 'assigned', uin };
  }
}
