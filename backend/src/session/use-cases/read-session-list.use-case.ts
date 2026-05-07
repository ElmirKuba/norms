import { Injectable } from '@nestjs/common';
import type { Platform } from '../../common/types/platform.type';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import type { SessionEntity } from '../../domain/entities/session.entity';

/** Элемент списка сессий. */
interface SessionListItem {
  /** ID сессии. */
  readonly id: string;
  /** Системное имя устройства. */
  readonly system_name: string;
  /** Прозвище устройства или null. */
  readonly nickname: string | null;
  /** Платформа устройства. */
  readonly platform: Platform;
  /** Флаг текущей сессии (из JWT). */
  readonly is_current: boolean;
  /** ISO-8601 дата создания сессии. */
  readonly created_at: string;
  /** ISO-8601 дата последнего обновления. */
  readonly updated_at: string;
}

/** Use-case получения списка сессий текущего аккаунта. */
@Injectable()
export class ReadSessionListUseCase {
  public constructor(private readonly _sessionRepo: SessionRepository) {}

  /**
   * Возвращает все активные сессии аккаунта с флагом текущей.
   * @param accountId - ID аккаунта.
   * @param currentSessionId - ID сессии из JWT для пометки is_current.
   * @returns Список сессий.
   */
  public async execute(accountId: string, currentSessionId: string): Promise<SessionListItem[]> {
    const sessions = await this._sessionRepo.findByAccountId(accountId);

    return sessions.map((session: SessionEntity): SessionListItem => ({
      id: session.id,
      system_name: session.systemName,
      nickname: session.nickname,
      platform: session.platform,
      is_current: session.id === currentSessionId,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
    }));
  }
}
