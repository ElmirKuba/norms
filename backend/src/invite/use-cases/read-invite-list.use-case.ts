import { Injectable, Inject } from '@nestjs/common';
import { and, eq, gt, desc } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../persistence/drizzle.module';
import type { DrizzleDb } from '../../persistence/drizzle.module';
import { invites } from '../../persistence/schemas';

/** Элемент списка активных инвайтов. */
interface InviteListItem {
  /** ID инвайта. */
  readonly id: string;
  /** 10-значный код приглашения. */
  readonly code: string;
  /** ISO-8601 дата истечения. */
  readonly expires_at: string;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}

/** Use-case получения списка активных инвайтов аккаунта. */
@Injectable()
export class ReadInviteListUseCase {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {}

  /**
   * Возвращает список активных (не просроченных) инвайтов аккаунта.
   * @param accountId - ID аккаунта.
   * @returns Массив активных инвайтов, отсортированных по дате создания (новые первые).
   */
  public async execute(accountId: string): Promise<InviteListItem[]> {
    const rows = await this._db
      .select()
      .from(invites)
      .where(and(eq(invites.accountId, accountId), gt(invites.expiresAt, new Date())))
      .orderBy(desc(invites.createdAt));

    return rows.map((row: typeof invites.$inferSelect): InviteListItem => ({
      id: row.id,
      code: row.code,
      expires_at: row.expiresAt.toISOString(),
      created_at: row.createdAt.toISOString(),
    }));
  }
}
