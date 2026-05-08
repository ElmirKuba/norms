import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import { WssConnectionStore } from '../../wss/wss-connection.store';

/** Форма ответа метода execute. */
interface ClearOtherSessionsResult {
  /** Количество удалённых сессий. */
  readonly kicked_count: number;
}

/** Use-case кика всех сессий аккаунта, кроме текущей. */
@Injectable()
export class ClearOtherSessionsUseCase {
  public constructor(
    private readonly _sessionRepo: SessionRepository,
    private readonly _wss: WssConnectionStore,
  ) {}

  /**
   * Удаляет все сессии аккаунта кроме текущей.
   * Каждой кикнутой сессии отправляется WSS-событие session_kicked.
   * @param accountId - ID аккаунта из JWT.
   * @param currentSessionId - ID текущей сессии — не будет удалена.
   * @returns Количество удалённых сессий.
   */
  public async execute(accountId: string, currentSessionId: string): Promise<ClearOtherSessionsResult> {
    const kickedIds = await this._sessionRepo.deleteAllByAccountIdExcept(accountId, currentSessionId);
    for (const id of kickedIds) {
      this._wss.sendToSession(id, 'session_kicked', {});
    }
    return { kicked_count: kickedIds.length };
  }
}
