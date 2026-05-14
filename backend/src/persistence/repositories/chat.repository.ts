import { Injectable, Inject } from '@nestjs/common';
import { eq, or, and, ne, inArray, desc, isNull, isNotNull } from 'drizzle-orm';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import type { ChatEntity, ChatListItem, OrphanPeer, PendingMessageEntity, CreateChatData, CreatePendingMessageData, SubmitKeyResult, PendingKeyRequest } from '../../domain/entities/chat.entity';
import { generateId } from '../../common/utils/id.util';
import { chats, sessions, accounts, uins, pendingMessages } from '../schemas';
import { DRIZZLE_DB } from '../drizzle.module';
import type { DrizzleDb } from '../drizzle.module';

/** Строка join-запроса peer-сессии с аккаунтом и UIN. */
interface PeerRow {
  /** ID сессии собеседника. */
  readonly sessionId: string;
  /** Системное имя устройства. */
  readonly systemName: string;
  /** Прозвище устройства или null. */
  readonly deviceNickname: string | null;
  /** ID аккаунта. */
  readonly accountId: string;
  /** Никнейм аккаунта или null. */
  readonly accountNickname: string | null;
  /** Username аккаунта или null. */
  readonly accountUsername: string | null;
  /** Номер UIN или null (ещё не назначен). */
  readonly uin: string | null;
}

/** Реализация порта ChatRepository через Drizzle ORM. */
@Injectable()
export class DrizzleChatRepository extends ChatRepository {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {
    super();
  }

  /**
   * Находит чат по ID.
   * @param id - ID чата.
   * @returns Сущность чата или null если не найден.
   */
  public async findById(id: string): Promise<ChatEntity | null> {
    const rows = await this._db.select().from(chats).where(eq(chats.id, id)).limit(1);
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Возвращает список чатов сессии с данными собеседника (2 запроса — без N+1).
   * @param sessionId - ID текущей сессии.
   * @returns Список чатов с peer-инфо, новые первые.
   */
  public async findListBySessionId(sessionId: string): Promise<ChatListItem[]> {
    const chatRows = await this._db
      .select()
      .from(chats)
      .where(or(eq(chats.sessionAId, sessionId), eq(chats.sessionBId, sessionId)))
      .orderBy(desc(chats.createdAt));

    if (chatRows.length === 0) return [];

    const peerSessionIds = chatRows.map(
      (r: typeof chats.$inferSelect): string => r.sessionAId === sessionId ? r.sessionBId : r.sessionAId,
    );
    const uniquePeerIds = [...new Set(peerSessionIds)];

    const peerRows = await this._db
      .select({
        sessionId: sessions.id,
        systemName: sessions.systemName,
        deviceNickname: sessions.nickname,
        accountId: sessions.accountId,
        accountNickname: accounts.nickname,
        accountUsername: accounts.username,
        uin: uins.number,
      })
      .from(sessions)
      .innerJoin(accounts, eq(accounts.id, sessions.accountId))
      .leftJoin(uins, eq(uins.accountId, sessions.accountId))
      .where(inArray(sessions.id, uniquePeerIds));

    const peerMap = new Map<string, PeerRow>(
      peerRows.map((r: PeerRow): [string, PeerRow] => [r.sessionId, r]),
    );

    const result: ChatListItem[] = [];
    for (const r of chatRows) {
      const peerSessionId = r.sessionAId === sessionId ? r.sessionBId : r.sessionAId;
      const peer = peerMap.get(peerSessionId);
      if (peer === undefined) continue;

      result.push({
        id: r.id,
        name: r.name,
        status: r.status,
        createdAt: r.createdAt,
        peer: {
          sessionId: peer.sessionId,
          systemName: peer.systemName,
          deviceNickname: peer.deviceNickname,
          accountId: peer.accountId,
          uin: peer.uin,
          nickname: peer.accountNickname,
          username: peer.accountUsername,
        },
      });
    }
    return result;
  }

  /**
   * Возвращает осиротевших собеседников — аккаунты с чатами из других сессий аккаунта,
   * но без чатов с текущей сессии. 5 батч-запросов, без N+1.
   * @param myAccountId - ID текущего аккаунта.
   * @param mySessionId - ID текущей сессии.
   * @returns Список осиротевших собеседников, last_chat_at DESC.
   */
  public async findOrphanPeers(myAccountId: string, mySessionId: string): Promise<OrphanPeer[]> {
    // Q1: другие сессии моего аккаунта
    const otherSessionRows = await this._db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.accountId, myAccountId), ne(sessions.id, mySessionId)));

    const otherSessionIds = otherSessionRows.map((r: { id: string }): string => r.id);
    if (otherSessionIds.length === 0) return [];

    // Q2: чаты других сессий → peer-сессии с датой
    const otherChats = await this._db
      .select({ sessionAId: chats.sessionAId, sessionBId: chats.sessionBId, createdAt: chats.createdAt })
      .from(chats)
      .where(or(inArray(chats.sessionAId, otherSessionIds), inArray(chats.sessionBId, otherSessionIds)));

    const otherSessionIdSet = new Set(otherSessionIds);
    const peerSessionToLastChat = new Map<string, Date>();
    for (const c of otherChats) {
      const peerSessId = otherSessionIdSet.has(c.sessionAId) ? c.sessionBId : c.sessionAId;
      if (otherSessionIdSet.has(peerSessId)) continue; // чат между двумя моими сессиями
      const prev = peerSessionToLastChat.get(peerSessId);
      if (prev === undefined || c.createdAt > prev) peerSessionToLastChat.set(peerSessId, c.createdAt);
    }
    if (peerSessionToLastChat.size === 0) return [];

    // Q3: peer-сессии → аккаунты + максимальная дата per account
    const peerSessionIds = [...peerSessionToLastChat.keys()];
    const peerSessRows = await this._db
      .select({ id: sessions.id, accountId: sessions.accountId })
      .from(sessions)
      .where(inArray(sessions.id, peerSessionIds));

    const accountToLastChat = new Map<string, Date>();
    for (const r of peerSessRows) {
      const lastChat = peerSessionToLastChat.get(r.id);
      if (lastChat === undefined) continue;
      const prev = accountToLastChat.get(r.accountId);
      if (prev === undefined || lastChat > prev) accountToLastChat.set(r.accountId, lastChat);
    }

    // Q4: чаты текущей сессии → peer-сессии → аккаунты для исключения
    const currentChats = await this._db
      .select({ sessionAId: chats.sessionAId, sessionBId: chats.sessionBId })
      .from(chats)
      .where(or(eq(chats.sessionAId, mySessionId), eq(chats.sessionBId, mySessionId)));

    const currentPeerSessIds = currentChats.map(
      (c: { sessionAId: string; sessionBId: string }): string =>
        c.sessionAId === mySessionId ? c.sessionBId : c.sessionAId,
    );

    const excludedAccountIds = new Set<string>();
    if (currentPeerSessIds.length > 0) {
      const currentPeerSessRows = await this._db
        .select({ accountId: sessions.accountId })
        .from(sessions)
        .where(inArray(sessions.id, currentPeerSessIds));
      for (const r of currentPeerSessRows) excludedAccountIds.add(r.accountId);
    }

    const orphanAccountIds = [...accountToLastChat.keys()].filter(
      (id: string): boolean => !excludedAccountIds.has(id),
    );
    if (orphanAccountIds.length === 0) return [];

    // Q5: account + UIN info
    const accountRows = await this._db
      .select({ accountId: accounts.id, nickname: accounts.nickname, username: accounts.username, uin: uins.number })
      .from(accounts)
      .leftJoin(uins, eq(uins.accountId, accounts.id))
      .where(inArray(accounts.id, orphanAccountIds));

    return accountRows
      .map((r: { accountId: string; nickname: string | null; username: string | null; uin: string | null }): OrphanPeer => ({
        accountId: r.accountId,
        uin: r.uin,
        nickname: r.nickname,
        username: r.username,
        lastChatAt: accountToLastChat.get(r.accountId) ?? new Date(0),
      }))
      .sort((a: OrphanPeer, b: OrphanPeer): number => b.lastChatAt.getTime() - a.lastChatAt.getTime());
  }

  /**
   * Находит недоставленное сообщение по ID.
   * @param id - ID сообщения.
   * @returns Сущность или null.
   */
  public async findPendingMessageById(id: string): Promise<PendingMessageEntity | null> {
    const rows = await this._db
      .select()
      .from(pendingMessages)
      .where(eq(pendingMessages.id, id))
      .limit(1);
    const row = rows[0];
    if (row === undefined) return null;
    return {
      id: row.id,
      chatId: row.chatId,
      senderSessionId: row.senderSessionId,
      receiverSessionId: row.receiverSessionId,
      encryptedBlob: row.encryptedBlob,
      createdAt: row.createdAt,
    };
  }

  /**
   * Удаляет недоставленное сообщение по ID.
   * @param id - ID сообщения.
   */
  public async deletePendingMessageById(id: string): Promise<void> {
    await this._db.delete(pendingMessages).where(eq(pendingMessages.id, id));
  }

  /**
   * Возвращает все pending_messages для сессии-получателя, старые первые.
   * @param receiverSessionId - ID сессии-получателя.
   * @returns Массив сообщений.
   */
  public async findPendingMessagesByReceiver(receiverSessionId: string): Promise<PendingMessageEntity[]> {
    const rows = await this._db
      .select()
      .from(pendingMessages)
      .where(eq(pendingMessages.receiverSessionId, receiverSessionId))
      .orderBy(pendingMessages.createdAt);
    return rows.map((row: typeof pendingMessages.$inferSelect): PendingMessageEntity => ({
      id: row.id,
      chatId: row.chatId,
      senderSessionId: row.senderSessionId,
      receiverSessionId: row.receiverSessionId,
      encryptedBlob: row.encryptedBlob,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Сохраняет недоставленное сообщение в pending_messages.
   * @param data - Данные сообщения.
   * @returns Созданная сущность сообщения.
   * @throws Error если INSERT не вернул строк.
   */
  public async createPendingMessage(data: CreatePendingMessageData): Promise<PendingMessageEntity> {
    const rows = await this._db
      .insert(pendingMessages)
      .values({
        id: generateId(),
        chatId: data.chatId,
        senderSessionId: data.senderSessionId,
        receiverSessionId: data.receiverSessionId,
        encryptedBlob: data.encryptedBlob,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error('INSERT не вернул строк');
    return {
      id: row.id,
      chatId: row.chatId,
      senderSessionId: row.senderSessionId,
      receiverSessionId: row.receiverSessionId,
      encryptedBlob: row.encryptedBlob,
      createdAt: row.createdAt,
    };
  }

  /**
   * Создаёт и сохраняет новый чат.
   * @param data - Данные для создания.
   * @returns Созданная сущность чата.
   * @throws Error если INSERT не вернул строк.
   */
  public async create(data: CreateChatData): Promise<ChatEntity> {
    const rows = await this._db
      .insert(chats)
      .values({
        id: generateId(),
        name: data.name,
        sessionAId: data.sessionAId,
        sessionBId: data.sessionBId,
        createdBySessionId: data.createdBySessionId,
        status: data.status,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) {
      throw new Error('INSERT не вернул строк');
    }
    return this._toEntity(row);
  }

  /**
   * Удаляет чат по ID. Pending_messages удаляются каскадом (FK ON DELETE CASCADE).
   * @param id - ID чата.
   */
  public async deleteById(id: string): Promise<void> {
    await this._db.delete(chats).where(eq(chats.id, id));
  }

  /**
   * Загружает публичный ключ сессии в чат в транзакции.
   * Если оба ключа присутствуют — очищает их из БД и переводит чат в active.
   * @param chatId - ID чата.
   * @param sessionId - ID текущей сессии (определяет slot A или B).
   * @param publicKey - X25519 публичный ключ в base64.
   * @returns Результат обмена.
   * @throws Error если чат не найден.
   */
  public async submitKey(chatId: string, sessionId: string, publicKey: string): Promise<SubmitKeyResult> {
    return this._db.transaction(async (tx) => {
      const rows = await tx.select().from(chats).where(eq(chats.id, chatId)).limit(1);
      const row = rows[0];
      if (row === undefined) throw new Error('Chat not found in submitKey');

      const isA = row.sessionAId === sessionId;
      const peerSessionId = isA ? row.sessionBId : row.sessionAId;
      const peerKey = isA ? row.publicKeyB : row.publicKeyA;

      const updateValues = isA
        ? { publicKeyA: publicKey, updatedAt: new Date() }
        : { publicKeyB: publicKey, updatedAt: new Date() };

      await tx.update(chats).set(updateValues).where(eq(chats.id, chatId));

      if (peerKey !== null) {
        await tx.update(chats).set({ publicKeyA: null, publicKeyB: null, status: 'active', updatedAt: new Date() }).where(eq(chats.id, chatId));
        return { exchangeComplete: true, peerSessionId, peerPublicKey: peerKey, myPublicKey: publicKey };
      }

      return { exchangeComplete: false, peerSessionId, peerPublicKey: null, myPublicKey: null };
    });
  }

  /**
   * Возвращает чаты, где сессия ещё не загрузила свой ключ, но у собеседника ключ уже есть.
   * @param sessionId - ID подключившейся сессии.
   * @returns Список pending key requests.
   */
  public async findPendingKeyRequestsForSession(sessionId: string): Promise<PendingKeyRequest[]> {
    const rows = await this._db
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.status, 'pending_key'),
          or(
            and(eq(chats.sessionAId, sessionId), isNull(chats.publicKeyA), isNotNull(chats.publicKeyB)),
            and(eq(chats.sessionBId, sessionId), isNull(chats.publicKeyB), isNotNull(chats.publicKeyA)),
          ),
        ),
      );

    return rows.map((row: typeof chats.$inferSelect): PendingKeyRequest => {
      const isA = row.sessionAId === sessionId;
      return {
        chatId: row.id,
        chatName: row.name,
        peerSessionId: isA ? row.sessionBId : row.sessionAId,
        peerPublicKey: (isA ? row.publicKeyB : row.publicKeyA) as string,
      };
    });
  }

  /**
   * Преобразует строку из БД в доменную сущность.
   * @param row - Строка из Drizzle-запроса.
   * @returns Доменная сущность чата.
   */
  private _toEntity(row: typeof chats.$inferSelect): ChatEntity {
    return {
      id: row.id,
      name: row.name,
      sessionAId: row.sessionAId,
      sessionBId: row.sessionBId,
      createdBySessionId: row.createdBySessionId,
      status: row.status,
      publicKeyA: row.publicKeyA,
      publicKeyB: row.publicKeyB,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
