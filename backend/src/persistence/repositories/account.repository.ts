import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import type { AccountEntity, CreateAccountData, UpdateAccountData } from '../../domain/entities/account.entity';
import { generateId } from '../../common/utils/id.util';
import { accounts } from '../schemas';
import { DRIZZLE_DB } from '../drizzle.module';
import type { DrizzleDb } from '../drizzle.module';

/** Drizzle ORM implementation of the AccountRepository port. */
@Injectable()
export class DrizzleAccountRepository extends AccountRepository {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {
    super();
  }

  /**
   * Returns all accounts.
   * @returns Array of account entities.
   */
  public async findAll(): Promise<AccountEntity[]> {
    const rows = await this._db.select().from(accounts);
    return rows.map((row: typeof accounts.$inferSelect): AccountEntity => this._toEntity(row));
  }

  /**
   * Finds an account by ID.
   * @param id - Account ID.
   * @returns Account entity or null if not found.
   */
  public async findById(id: string): Promise<AccountEntity | null> {
    const rows = await this._db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Creates and persists a new account.
   * @param data - Account creation data.
   * @returns Created account entity.
   * @throws Error if the database insert returned no rows.
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
      throw new Error('Insert returned no rows');
    }
    return this._toEntity(row);
  }

  /**
   * Updates specified fields on an existing account.
   * @param id - Account ID.
   * @param data - Fields to update.
   * @returns Updated account entity or null if not found.
   */
  public async update(id: string, data: UpdateAccountData): Promise<AccountEntity | null> {
    const setValues = {
      updatedAt: new Date().toISOString(),
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
   * Deletes an account by ID.
   * @param id - Account ID.
   */
  public async delete(id: string): Promise<void> {
    await this._db.delete(accounts).where(eq(accounts.id, id));
  }

  /**
   * Maps a raw database row to a domain entity.
   * @param row - Raw Drizzle row.
   * @returns Account domain entity.
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
