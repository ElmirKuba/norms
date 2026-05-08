import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import { sql, and, eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../persistence/drizzle.module';
import type { DrizzleDb, DrizzleTransaction } from '../../persistence/drizzle.module';
import { accounts, invites } from '../../persistence/schemas';

/** Use-case отзыва инвайт-кода: атомарное удаление + инкремент invites_remaining. */
@Injectable()
export class RevokeInviteUseCase {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {}

  /**
   * Отзывает инвайт и возвращает +1 к лимиту создателя.
   * @param inviteId - ID инвайта для отзыва.
   * @param accountId - ID аккаунта, выполняющего отзыв.
   * @throws NotFoundException если инвайт не найден.
   * @throws ForbiddenException если инвайт принадлежит другому аккаунту.
   */
  public async execute(inviteId: string, accountId: string): Promise<void> {
    await this._db.transaction(async (tx: DrizzleTransaction): Promise<void> => {
      const deleted = await tx
        .delete(invites)
        .where(and(eq(invites.id, inviteId), eq(invites.accountId, accountId)))
        .returning({ id: invites.id });

      if (deleted.length === 0) {
        const existing = await tx
          .select({ accountId: invites.accountId })
          .from(invites)
          .where(eq(invites.id, inviteId))
          .limit(1);

        if (existing.length === 0) {
          throw new NotFoundException(makeError(ErrorCode.INVITE_NOT_FOUND));
        }
        throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_INVITE));
      }

      await tx
        .update(accounts)
        .set({ invitesRemaining: sql`${accounts.invitesRemaining} + 1` })
        .where(eq(accounts.id, accountId));
    });
  }
}
