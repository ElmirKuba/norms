import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import { WssConnectionStore } from '../../wss/wss-connection.store';
import { ErrorCode, makeError } from '../../common/errors/error-codes';

/** Use-case кика сессии по ID (своей или чужой в рамках аккаунта). */
@Injectable()
export class DeleteSessionUseCase {
  public constructor(
    private readonly _sessionRepo: SessionRepository,
    private readonly _wss: WssConnectionStore,
  ) {}

  /**
   * Удаляет сессию по ID. Нельзя удалить сессию другого аккаунта.
   * Кикнутой сессии отправляется WSS-событие session_kicked.
   * @param accountId - ID текущего аккаунта (из JWT).
   * @param sessionId - ID сессии для удаления.
   * @returns Промис без значения.
   */
  public async execute(accountId: string, sessionId: string): Promise<void> {
    const session = await this._sessionRepo.findById(sessionId);

    if (session === null) {
      throw new NotFoundException(makeError(ErrorCode.SESSION_NOT_FOUND));
    }

    if (session.accountId !== accountId) {
      throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_SESSION));
    }

    await this._sessionRepo.deleteById(sessionId);
    this._wss.sendToSession(sessionId, 'session_kicked', {});
  }
}
