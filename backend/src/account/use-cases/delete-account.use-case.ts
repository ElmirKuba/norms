import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import type { SessionEntity } from '../../domain/entities/session.entity';
import { WssConnectionStore } from '../../wss/wss-connection.store';

/** Use-case удаления аккаунта со всеми связанными данными. */
@Injectable()
export class DeleteAccountUseCase {
  public constructor(
    private readonly _accountRepo: AccountRepository,
    private readonly _sessionRepo: SessionRepository,
    private readonly _wss: WssConnectionStore,
  ) {}

  /**
   * Удаляет аккаунт и кикает все его активные сессии через WSS.
   * @param accountId - ID аккаунта из JWT.
   */
  public async execute(accountId: string): Promise<void> {
    const sessions = await this._sessionRepo.findByAccountId(accountId);
    const sessionIds = sessions.map((s: SessionEntity): string => s.id);

    await this._accountRepo.delete(accountId);

    for (const sessionId of sessionIds) {
      this._wss.sendToSession(sessionId, 'session_kicked', {});
    }
  }
}
