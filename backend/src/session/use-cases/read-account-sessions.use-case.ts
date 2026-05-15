import { Injectable } from '@nestjs/common';
import type { Platform } from '../../common/types/platform.type';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import type { SessionEntity } from '../../domain/entities/session.entity';

/** Публичное представление сессии для выбора устройства собеседника. */
interface AccountSessionItem {
  /** ID сессии. */
  readonly id: string;
  /** Системное имя устройства. */
  readonly system_name: string;
  /** Прозвище устройства или null. */
  readonly nickname: string | null;
  /** Платформа устройства. */
  readonly platform: Platform;
}

/** Use-case получения списка сессий чужого аккаунта (для модалки создания чата). */
@Injectable()
export class ReadAccountSessionsUseCase {
  public constructor(private readonly _sessionRepo: SessionRepository) {}

  /**
   * Возвращает активные сессии аккаунта без чувствительных данных.
   * @param accountId - ID аккаунта чьи сессии запрашиваются.
   * @param excludeSessionId - ID сессии, которую нужно исключить из результата (текущая сессия).
   * @returns Список сессий.
   */
  public async execute(accountId: string, excludeSessionId: string): Promise<AccountSessionItem[]> {
    const sessions = await this._sessionRepo.findByAccountId(accountId);

    return sessions
      .filter((session: SessionEntity): boolean => session.id !== excludeSessionId)
      .map((session: SessionEntity): AccountSessionItem => ({
        id: session.id,
        system_name: session.systemName,
        nickname: session.nickname,
        platform: session.platform,
      }));
  }
}
