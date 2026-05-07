import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InviteRepository } from '../../domain/ports/invite.repository.port';
import type { InviteEntity, CreateInviteData } from '../../domain/entities/invite.entity';
import { generateId } from '../../common/utils/id.util';
import { invites } from '../schemas';
import { DRIZZLE_DB } from '../drizzle.module';
import type { DrizzleDb } from '../drizzle.module';

/** Реализация порта InviteRepository через Drizzle ORM. */
@Injectable()
export class DrizzleInviteRepository extends InviteRepository {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {
    super();
  }

  /**
   * Находит инвайт по коду.
   * @param code - Код приглашения.
   * @returns Сущность инвайта или null если не найден.
   */
  public async findByCode(code: string): Promise<InviteEntity | null> {
    const rows = await this._db
      .select()
      .from(invites)
      .where(eq(invites.code, code))
      .limit(1);
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Создаёт и сохраняет новый инвайт.
   * @param data - Данные для создания.
   * @returns Созданная сущность инвайта.
   * @throws Error если INSERT не вернул строк.
   */
  public async create(data: CreateInviteData): Promise<InviteEntity> {
    const rows = await this._db
      .insert(invites)
      .values({
        id: generateId(),
        accountId: data.accountId,
        code: data.code,
        expiresAt: data.expiresAt,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) {
      throw new Error('INSERT не вернул строк');
    }
    return this._toEntity(row);
  }

  /**
   * Удаляет инвайт по ID.
   * @param id - ID инвайта.
   */
  public async delete(id: string): Promise<void> {
    await this._db.delete(invites).where(eq(invites.id, id));
  }

  /**
   * Преобразует строку из БД в доменную сущность.
   * @param row - Строка из Drizzle-запроса.
   * @returns Доменная сущность инвайта.
   */
  private _toEntity(row: typeof invites.$inferSelect): InviteEntity {
    return {
      id: row.id,
      accountId: row.accountId,
      code: row.code,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }
}
