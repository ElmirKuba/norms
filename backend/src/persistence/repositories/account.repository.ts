import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import type { AccountEntity, CreateAccountData, UpdateAccountData } from '../../domain/entities/account.entity';
import { generateId } from '../../common/utils/id.util';
import { accounts } from '../schemas';
import { DRIZZLE_DB } from '../drizzle.module';
import type { DrizzleDb } from '../drizzle.module';

/** Реализация порта AccountRepository через Drizzle ORM. */
@Injectable()
export class DrizzleAccountRepository extends AccountRepository {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {
    super();
  }

  /**
   * Возвращает все аккаунты.
   * @returns Массив сущностей аккаунтов.
   */
  public async findAll(): Promise<AccountEntity[]> {
    const rows = await this._db.select().from(accounts);
    return rows.map((row: typeof accounts.$inferSelect): AccountEntity => this._toEntity(row));
  }

  /**
   * Находит аккаунт по ID.
   * @param id - ID аккаунта.
   * @returns Сущность аккаунта или null если не найден.
   */
  public async findById(id: string): Promise<AccountEntity | null> {
    const rows = await this._db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Создаёт и сохраняет новый аккаунт.
   * @param data - Данные для создания.
   * @returns Созданная сущность аккаунта.
   * @throws Error если INSERT не вернул строк.
   */
  public async create(data: CreateAccountData): Promise<AccountEntity> {
    const rows = await this._db
      .insert(accounts)
      .values({
        id: generateId(),
        passwordHash: data.passwordHash,
        username: data.username ?? null,
        invitesRemaining: data.invitesRemaining ?? 3,
        isAdmin: data.isAdmin ?? false,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) {
      throw new Error('INSERT не вернул строк');
    }
    return this._toEntity(row);
  }

  /**
   * Обновляет указанные поля существующего аккаунта.
   * @param id - ID аккаунта.
   * @param data - Поля для обновления.
   * @returns Обновлённая сущность или null если не найден.
   */
  public async update(id: string, data: UpdateAccountData): Promise<AccountEntity | null> {
    const setValues = {
      updatedAt: new Date(),
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.passwordHash !== undefined ? { passwordHash: data.passwordHash } : {}),
      ...(data.invitesRemaining !== undefined ? { invitesRemaining: data.invitesRemaining } : {}),
    };
    const rows = await this._db
      .update(accounts)
      .set(setValues)
      .where(eq(accounts.id, id))
      .returning();
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Удаляет аккаунт по ID.
   * @param id - ID аккаунта.
   */
  public async delete(id: string): Promise<void> {
    await this._db.delete(accounts).where(eq(accounts.id, id));
  }

  /**
   * Преобразует строку из БД в доменную сущность.
   * @param row - Строка из Drizzle-запроса.
   * @returns Доменная сущность аккаунта.
   */
  private _toEntity(row: typeof accounts.$inferSelect): AccountEntity {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      invitesRemaining: row.invitesRemaining,
      isAdmin: row.isAdmin,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
