import type { ChatEntity, CreateChatData } from '../entities/chat.entity';

/** Порт (абстракция) для операций с чатами — реализуется в слое персистентности. */
export abstract class ChatRepository {
  /**
   * Находит чат по ID.
   * @param id - ID чата.
   * @returns Сущность чата или null если не найден.
   */
  public abstract findById(id: string): Promise<ChatEntity | null>;

  /**
   * Создаёт и сохраняет новый чат.
   * @param data - Данные для создания.
   * @returns Созданная сущность чата.
   */
  public abstract create(data: CreateChatData): Promise<ChatEntity>;
}
