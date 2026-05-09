import { Injectable, Inject } from '@nestjs/common';
import { and, eq, like } from 'drizzle-orm';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import type { AccountEntity, AccountSearchResult, CreateAccountData, UpdateAccountData } from '../../domain/entities/account.entity';
import { generateId } from '../../common/utils/id.util';
import { accounts, uins } from '../schemas';
import { DRIZZLE_DB } from '../drizzle.module';
import type { DrizzleDb, DrizzleTransaction } from '../drizzle.module';

/** Строка Drizzle-запроса при поиске по UIN (inner join). */
interface UinSearchRow {
  /** ID аккаунта. */
  readonly accountId: string;
  /** Username или null. */
  readonly username: string | null;
  /** Номер UIN (гарантированно присутствует при inner join). */
  readonly uin: string;
}

/** Строка Drizzle-запроса при поиске по username (left join, UIN может отсутствовать). */
interface UsernameSearchRow {
  /** ID аккаунта. */
  readonly accountId: string;
  /** Username или null. */
  readonly username: string | null;
  /** Номер UIN или null. */
  readonly uin: string | null;
}

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
   * Находит аккаунт по юзернейму (без учёта регистра — citext в БД).
   * @param username - Юзернейм.
   * @returns Сущность аккаунта или null если не найден.
   */
  public async findByUsername(username: string): Promise<AccountEntity | null> {
    const rows = await this._db
      .select()
      .from(accounts)
      .where(eq(accounts.username, username))
      .limit(1);
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Находит аккаунт по номеру UIN через JOIN с таблицей uins.
   * @param uinNumber - Числовой UIN в виде строки.
   * @returns Сущность аккаунта или null если не найден.
   */
  public async findByUin(uinNumber: string): Promise<AccountEntity | null> {
    const rows = await this._db
      .select({ account: accounts })
      .from(accounts)
      .innerJoin(uins, eq(uins.accountId, accounts.id))
      .where(eq(uins.number, uinNumber))
      .limit(1);
    const row = rows[0];
    return row !== undefined ? this._toEntity(row.account) : null;
  }

  /**
   * Возвращает UIN-номер аккаунта или null если UIN ещё не назначен.
   * @param accountId - ID аккаунта.
   * @returns Строка UIN или null.
   */
  public async findUinByAccountId(accountId: string): Promise<string | null> {
    const rows = await this._db
      .select({ number: uins.number })
      .from(uins)
      .where(eq(uins.accountId, accountId))
      .limit(1);
    return rows[0]?.number ?? null;
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
      ...(data.nickname !== undefined ? { nickname: data.nickname } : {}),
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
   * Обновляет хеш пароля аккаунта.
   * @param id - ID аккаунта.
   * @param passwordHash - Новый argon2id-хеш пароля.
   */
  public async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this._db
      .update(accounts)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(accounts.id, id));
  }

  /**
   * Поиск по UIN (точный) или username (префикс, CITEXT — case-insensitive).
   * @param q - Строка запроса.
   * @param limit - Лимит результатов.
   * @returns Массив результатов с account_id, uin, username.
   */
  public async search(q: string, limit: number): Promise<AccountSearchResult[]> {
    const firstChar = q[0];
    const isUinQuery = firstChar !== undefined && /^\d$/.test(firstChar);

    if (isUinQuery) {
      const rows = await this._db
        .select({ accountId: accounts.id, username: accounts.username, uin: uins.number })
        .from(accounts)
        .innerJoin(uins, eq(uins.accountId, accounts.id))
        .where(eq(uins.number, q))
        .limit(limit);
      return rows.map((r: UinSearchRow): AccountSearchResult => ({
        accountId: r.accountId,
        uin: r.uin,
        username: r.username,
      }));
    }

    const rows = await this._db
      .select({ accountId: accounts.id, username: accounts.username, uin: uins.number })
      .from(accounts)
      .leftJoin(uins, eq(uins.accountId, accounts.id))
      .where(like(accounts.username, `${q}%`))
      .limit(limit);
    return rows.map((r: UsernameSearchRow): AccountSearchResult => ({
      accountId: r.accountId,
      uin: r.uin ?? null,
      username: r.username,
    }));
  }

  /**
   * Удаляет аккаунт по ID в транзакции: отвязывает/удаляет UIN, затем удаляет аккаунт.
   * Премиум-UIN возвращается в пул (account_id = NULL), обычный — удаляется.
   * Все связанные сессии, инвайты, Q/A убираются каскадом через FK.
   * @param id - ID аккаунта.
   */
  public async delete(id: string): Promise<void> {
    await this._db.transaction(async (tx: DrizzleTransaction): Promise<void> => {
      await tx
        .update(uins)
        .set({ accountId: null, updatedAt: new Date() })
        .where(and(eq(uins.accountId, id), eq(uins.isPremium, true)));

      await tx
        .delete(uins)
        .where(and(eq(uins.accountId, id), eq(uins.isPremium, false)));

      await tx.delete(accounts).where(eq(accounts.id, id));
    });
  }

  /**
   * Преобразует строку из БД в доменную сущность.
   * @param row - Строка из Drizzle-запроса.
   * @returns Доменная сущность аккаунта.
   */
  private _toEntity(row: typeof accounts.$inferSelect): AccountEntity {
    return {
      id: row.id,
      nickname: row.nickname,
      username: row.username,
      passwordHash: row.passwordHash,
      invitesRemaining: row.invitesRemaining,
      isAdmin: row.isAdmin,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
