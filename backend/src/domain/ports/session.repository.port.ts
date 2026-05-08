import type { SessionEntity, CreateSessionData } from '../entities/session.entity';

/** Порт (абстракция) для операций с сессиями — реализуется в слое персистентности. */
export abstract class SessionRepository {
  /**
   * Находит сессию по ID.
   * @param id - ID сессии.
   * @returns Сущность сессии или null если не найдена.
   */
  public abstract findById(id: string): Promise<SessionEntity | null>;

  /**
   * Возвращает все сессии аккаунта.
   * @param accountId - ID аккаунта.
   * @returns Массив сессий.
   */
  public abstract findByAccountId(accountId: string): Promise<SessionEntity[]>;

  /**
   * Возвращает количество активных сессий аккаунта.
   * @param accountId - ID аккаунта.
   * @returns Количество сессий.
   */
  public abstract countByAccountId(accountId: string): Promise<number>;

  /**
   * Создаёт и сохраняет новую сессию.
   * @param data - Данные для создания.
   * @returns Созданная сущность сессии.
   */
  public abstract create(data: CreateSessionData): Promise<SessionEntity>;

  /**
   * Атомарно ротирует refresh-токен: обновляет WHERE old_hash = oldHash.
   * Если hash не совпал (reuse detection) — возвращает null.
   * @param oldHash - Старый SHA-256 хеш refresh-токена.
   * @param newHash - Новый SHA-256 хеш refresh-токена.
   * @returns Обновлённая сессия или null при обнаружении повторного использования.
   */
  public abstract rotateRefreshToken(
    oldHash: string,
    newHash: string,
  ): Promise<SessionEntity | null>;

  /**
   * Удаляет сессию по ID.
   * @param id - ID сессии.
   */
  public abstract deleteById(id: string): Promise<void>;

  /**
   * Удаляет все сессии аккаунта, кроме указанной.
   * @param accountId - ID аккаунта.
   * @param excludeId - ID сессии, которую не удалять.
   * @returns Количество удалённых сессий.
   */
  public abstract deleteAllByAccountIdExcept(
    accountId: string,
    excludeId: string,
  ): Promise<number>;

  /**
   * Обновляет прозвище сессии. null — снять прозвище.
   * @param id - ID сессии.
   * @param nickname - Новое прозвище или null.
   */
  public abstract updateNickname(id: string, nickname: string | null): Promise<void>;
}
