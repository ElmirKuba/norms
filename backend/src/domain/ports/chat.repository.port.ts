import type { ChatEntity, ChatListItem, OrphanPeer, CreateChatData } from '../entities/chat.entity';

/** Порт (абстракция) для операций с чатами — реализуется в слое персистентности. */
export abstract class ChatRepository {
  /**
   * Находит чат по ID.
   * @param id - ID чата.
   * @returns Сущность чата или null если не найден.
   */
  public abstract findById(id: string): Promise<ChatEntity | null>;

  /**
   * Возвращает список чатов сессии с данными собеседника.
   * @param sessionId - ID сессии чьи чаты запрашиваются.
   * @returns Список чатов с peer-инфо, отсортированных по дате создания (новые первые).
   */
  public abstract findListBySessionId(sessionId: string): Promise<ChatListItem[]>;

  /**
   * Возвращает аккаунты, с которыми были чаты с других сессий аккаунта,
   * но нет чатов с текущей сессии (осиротевшие собеседники).
   * @param myAccountId - ID текущего аккаунта.
   * @param mySessionId - ID текущей сессии (исключается из других + используется для фильтра).
   * @returns Список осиротевших собеседников, отсортированных по last_chat_at DESC.
   */
  public abstract findOrphanPeers(myAccountId: string, mySessionId: string): Promise<OrphanPeer[]>;

  /**
   * Создаёт и сохраняет новый чат.
   * @param data - Данные для создания.
   * @returns Созданная сущность чата.
   */
  public abstract create(data: CreateChatData): Promise<ChatEntity>;
}
