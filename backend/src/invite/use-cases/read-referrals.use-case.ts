import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../persistence/drizzle.module';
import type { DrizzleDb } from '../../persistence/drizzle.module';
import { accounts, uins, referrals } from '../../persistence/schemas';

/** Данные одного участника реферальной цепочки. */
interface ReferralItem {
  /** ID аккаунта. */
  readonly account_id: string;
  /** UIN аккаунта (null если ещё не назначен). */
  readonly uin: string | null;
  /** Юзернейм (null если не задан). */
  readonly username: string | null;
  /** ISO-8601 дата вступления. */
  readonly joined_at: string;
}

/** Форма ответа метода execute. */
interface ReadReferralsResult {
  /** Кто пригласил текущий аккаунт (null при свободной регистрации или удалённом инвайтере). */
  readonly inviter: ReferralItem | null;
  /** Список аккаунтов, приглашённых текущим аккаунтом. */
  readonly invitees: ReferralItem[];
}

/** Use-case чтения реферальной информации аккаунта. */
@Injectable()
export class ReadReferralsUseCase {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {}

  /**
   * Возвращает кто пригласил аккаунт и кого он пригласил сам.
   * @param accountId - ID аккаунта.
   * @returns Реферальная информация.
   */
  public async execute(accountId: string): Promise<ReadReferralsResult> {
    const [inviterRows, inviteeRows] = await Promise.all([
      this._db
        .select({
          accountId: accounts.id,
          username: accounts.username,
          uin: uins.number,
          joinedAt: referrals.createdAt,
        })
        .from(referrals)
        .leftJoin(accounts, eq(accounts.id, referrals.inviterId))
        .leftJoin(uins, eq(uins.accountId, referrals.inviterId))
        .where(eq(referrals.inviteeId, accountId))
        .limit(1),

      this._db
        .select({
          accountId: accounts.id,
          username: accounts.username,
          uin: uins.number,
          joinedAt: referrals.createdAt,
        })
        .from(referrals)
        .innerJoin(accounts, eq(accounts.id, referrals.inviteeId))
        .leftJoin(uins, eq(uins.accountId, referrals.inviteeId))
        .where(eq(referrals.inviterId, accountId))
        .orderBy(desc(referrals.createdAt)),
    ]);

    const inviterRow = inviterRows[0];
    const inviter: ReferralItem | null =
      inviterRow !== undefined && inviterRow.accountId !== null
        ? {
            account_id: inviterRow.accountId,
            uin: inviterRow.uin,
            username: inviterRow.username,
            joined_at: inviterRow.joinedAt.toISOString(),
          }
        : null;

    const invitees: ReferralItem[] = inviteeRows.map((row: typeof inviteeRows[0]): ReferralItem => ({
      account_id: row.accountId,
      uin: row.uin,
      username: row.username,
      joined_at: row.joinedAt.toISOString(),
    }));

    return { inviter, invitees };
  }
}
