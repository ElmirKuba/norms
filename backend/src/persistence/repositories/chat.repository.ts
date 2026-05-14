import { Injectable, Inject } from '@nestjs/common';
import { eq, or, inArray, desc } from 'drizzle-orm';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import type { ChatEntity, ChatListItem, CreateChatData } from '../../domain/entities/chat.entity';
import { generateId } from '../../common/utils/id.util';
import { chats, sessions, accounts, uins } from '../schemas';
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
