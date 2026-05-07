import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SessionRepository } from '../../domain/ports/session.repository.port';

/** Use-case кика сессии по ID (своей или чужой в рамках аккаунта). */
@Injectable()
export class DeleteSessionUseCase {
  public constructor(private readonly _sessionRepo: SessionRepository) {}

  /**
   * Удаляет сессию по ID. Нельзя удалить сессию другого аккаунта.
   * @param accountId - ID текущего аккаунта (из JWT).
   * @param sessionId - ID сессии для удаления.
   * @returns Промис без значения.
   */
  public async execute(accountId: string, sessionId: string): Promise<void> {
    const session = await this._sessionRepo.findById(sessionId);

    if (session === null) {
      throw new NotFoundException({ message: 'Session not found', code: 'session_not_found' });
    }

    if (session.accountId !== accountId) {
      throw new ForbiddenException({ message: 'Not your session', code: 'not_your_session' });
    }

    await this._sessionRepo.deleteById(sessionId);
  }
}
