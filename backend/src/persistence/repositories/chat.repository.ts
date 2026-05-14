import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import type { ChatEntity, CreateChatData } from '../../domain/entities/chat.entity';
import { generateId } from '../../common/utils/id.util';
import { chats } from '../schemas';
import { DRIZZLE_DB } from '../drizzle.module';
import type { DrizzleDb } from '../drizzle.module';

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
