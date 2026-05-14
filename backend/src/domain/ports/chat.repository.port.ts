import type { ChatEntity, ChatListItem, OrphanPeer, PendingMessageEntity, CreateChatData, CreatePendingMessageData } from '../entities/chat.entity';

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
   * Находит недоставленное сообщение по ID.
   * @param id - ID сообщения.
   * @returns Сущность сообщения или null.
   */
  public abstract findPendingMessageById(id: string): Promise<PendingMessageEntity | null>;

  /**
   * Возвращает все недоставленные сообщения для сессии-получателя, отсортированные по дате (старые первые).
   * @param receiverSessionId - ID сессии-получателя.
   * @returns Массив сообщений.
   */
  public abstract findPendingMessagesByReceiver(receiverSessionId: string): Promise<PendingMessageEntity[]>;

  /**
   * Удаляет недоставленное сообщение по ID.
   * @param id - ID сообщения.
   */
  public abstract deletePendingMessageById(id: string): Promise<void>;

  /**
   * Сохраняет недоставленное сообщение.
   * @param data - Данные сообщения.
   * @returns Созданная сущность сообщения.
   */
  public abstract createPendingMessage(data: CreatePendingMessageData): Promise<PendingMessageEntity>;

  /**
   * Создаёт и сохраняет новый чат.
   * @param data - Данные для создания.
   * @returns Созданная сущность чата.
   */
  public abstract create(data: CreateChatData): Promise<ChatEntity>;

  /**
   * Удаляет чат по ID. Pending_messages каскадируются на уровне БД.
   * @param id - ID чата.
   */
  public abstract deleteById(id: string): Promise<void>;
}
