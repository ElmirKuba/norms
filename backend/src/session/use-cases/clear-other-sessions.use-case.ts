import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../domain/ports/session.repository.port';

/** Форма ответа метода execute. */
interface ClearOtherSessionsResult {
  /** Количество удалённых сессий. */
  readonly kicked_count: number;
}

/** Use-case кика всех сессий аккаунта, кроме текущей. */
@Injectable()
export class ClearOtherSessionsUseCase {
  public constructor(private readonly _sessionRepo: SessionRepository) {}

  /**
   * Удаляет все сессии аккаунта кроме текущей.
   * @param accountId - ID аккаунта из JWT.
   * @param currentSessionId - ID текущей сессии из JWT — не будет удалена.
   * @returns Количество удалённых сессий.
   */
  public async execute(accountId: string, currentSessionId: string): Promise<ClearOtherSessionsResult> {
    const kickedCount = await this._sessionRepo.deleteAllByAccountIdExcept(accountId, currentSessionId);
    return { kicked_count: kickedCount };
  }
}
