import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ne, sql } from 'drizzle-orm';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import type { SessionEntity, CreateSessionData } from '../../domain/entities/session.entity';
import { generateId } from '../../common/utils/id.util';
import { sessions } from '../schemas';
import { DRIZZLE_DB } from '../drizzle.module';
import type { DrizzleDb } from '../drizzle.module';

/** Реализация порта SessionRepository через Drizzle ORM. */
@Injectable()
export class DrizzleSessionRepository extends SessionRepository {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {
    super();
  }

  /**
   * Находит сессию по ID.
   * @param id - ID сессии.
   * @returns Сущность сессии или null если не найдена.
   */
  public async findById(id: string): Promise<SessionEntity | null> {
    const rows = await this._db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Возвращает все сессии аккаунта.
   * @param accountId - ID аккаунта.
   * @returns Массив сессий.
   */
  public async findByAccountId(accountId: string): Promise<SessionEntity[]> {
    const rows = await this._db.select().from(sessions).where(eq(sessions.accountId, accountId));
    return rows.map((row: typeof sessions.$inferSelect): SessionEntity => this._toEntity(row));
  }

  /**
   * Возвращает количество сессий аккаунта.
   * @param accountId - ID аккаунта.
   * @returns Количество сессий.
   */
  public async countByAccountId(accountId: string): Promise<number> {
    const result = await this._db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(eq(sessions.accountId, accountId));
    return result[0]?.count ?? 0;
  }

  /**
   * Создаёт и сохраняет новую сессию.
   * @param data - Данные для создания.
   * @returns Созданная сущность сессии.
   * @throws Error если INSERT не вернул строк.
   */
  public async create(data: CreateSessionData): Promise<SessionEntity> {
    const rows = await this._db
      .insert(sessions)
      .values({
        id: generateId(),
        accountId: data.accountId,
        systemName: data.systemName,
        platform: data.platform,
        nickname: data.nickname ?? null,
        refreshTokenHash: data.refreshTokenHash,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) {
      throw new Error('INSERT не вернул строк');
    }
    return this._toEntity(row);
  }

  /**
   * Атомарно ротирует refresh-токен по совпадению старого хеша.
   * @param oldHash - Старый SHA-256 хеш.
   * @param newHash - Новый SHA-256 хеш.
   * @returns Обновлённая сессия или null (хеш не совпал — reuse detection).
   */
  public async rotateRefreshToken(oldHash: string, newHash: string): Promise<SessionEntity | null> {
    const rows = await this._db
      .update(sessions)
      .set({ refreshTokenHash: newHash, updatedAt: new Date() })
      .where(eq(sessions.refreshTokenHash, oldHash))
      .returning();
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Удаляет сессию по ID.
   * @param id - ID сессии.
   */
  public async deleteById(id: string): Promise<void> {
    await this._db.delete(sessions).where(eq(sessions.id, id));
  }

  /**
   * Удаляет все сессии аккаунта кроме указанной.
   * @param accountId - ID аккаунта.
   * @param excludeId - ID сессии, которую оставить.
   * @returns Количество удалённых сессий.
   */
  public async deleteAllByAccountIdExcept(accountId: string, excludeId: string): Promise<number> {
    const deleted = await this._db
      .delete(sessions)
      .where(and(eq(sessions.accountId, accountId), ne(sessions.id, excludeId)))
      .returning({ id: sessions.id });
    return deleted.length;
  }

  /**
   * Обновляет прозвище сессии. null — снять прозвище.
   * @param id - ID сессии.
   * @param nickname - Новое прозвище или null.
   */
  public async updateNickname(id: string, nickname: string | null): Promise<void> {
    await this._db
      .update(sessions)
      .set({ nickname, updatedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  /**
   * Преобразует строку из БД в доменную сущность.
   * @param row - Строка из Drizzle-запроса.
   * @returns Доменная сущность сессии.
   */
  private _toEntity(row: typeof sessions.$inferSelect): SessionEntity {
    return {
      id: row.id,
      accountId: row.accountId,
      systemName: row.systemName,
      platform: row.platform,
      nickname: row.nickname,
      refreshTokenHash: row.refreshTokenHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
