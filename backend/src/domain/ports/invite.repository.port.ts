import type { InviteEntity, CreateInviteData } from '../entities/invite.entity';

/** Порт (абстракция) для операций с инвайтами — реализуется в слое персистентности. */
export abstract class InviteRepository {
  /**
   * Находит инвайт по коду.
   * @param code - 10-значный код приглашения.
   * @returns Сущность инвайта или null если не найден.
   */
  public abstract findByCode(code: string): Promise<InviteEntity | null>;

  /**
   * Создаёт и сохраняет новый инвайт.
   * @param data - Данные для создания.
   * @returns Созданная сущность инвайта.
   */
  public abstract create(data: CreateInviteData): Promise<InviteEntity>;

  /**
   * Удаляет инвайт по ID.
   * @param id - ID инвайта.
   */
  public abstract delete(id: string): Promise<void>;
}
