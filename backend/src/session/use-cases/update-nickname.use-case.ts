import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../domain/ports/session.repository.port';

/** Use-case установки/снятия прозвища текущей сессии. */
@Injectable()
export class UpdateNicknameUseCase {
  public constructor(private readonly _sessionRepo: SessionRepository) {}

  /**
   * Обновляет прозвище сессии. null — снять прозвище.
   * @param sessionId - ID текущей сессии из JWT.
   * @param nickname - Новое прозвище или null.
   * @returns Промис без значения.
   */
  public async execute(sessionId: string, nickname: string | null): Promise<void> {
    await this._sessionRepo.updateNickname(sessionId, nickname);
  }
}
