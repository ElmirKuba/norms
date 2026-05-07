import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../domain/ports/session.repository.port';

/** Use-case выхода из аккаунта — удаляет текущую сессию. */
@Injectable()
export class LogoutUseCase {
  public constructor(private readonly _sessionRepo: SessionRepository) {}

  /**
   * Удаляет сессию по ID.
   * @param sessionId - ID сессии из JWT.
   */
  public async execute(sessionId: string): Promise<void> {
    await this._sessionRepo.deleteById(sessionId);
  }
}
