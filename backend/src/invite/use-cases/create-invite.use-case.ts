import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import { ConfigService } from '@nestjs/config';
import { DatabaseError } from 'pg';
import { sql, and, eq, gt } from 'drizzle-orm';
import { generateId } from '../../common/utils/id.util';
import { DRIZZLE_DB } from '../../persistence/drizzle.module';
import type { DrizzleDb, DrizzleTransaction } from '../../persistence/drizzle.module';
import { accounts, invites } from '../../persistence/schemas';

/** Форма ответа метода execute. */
interface CreateInviteResult {
  /** ID созданного инвайта. */
  readonly id: string;
  /** 10-значный код приглашения. */
  readonly code: string;
  /** ISO-8601 дата истечения. */
  readonly expires_at: string;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}

/** Use-case создания инвайт-кода: проверка лимита + атомарный декремент + INSERT. */
@Injectable()
export class CreateInviteUseCase {
  /** Максимальное количество попыток при коллизии кода. */
  private static readonly _maxCodeRetries: number = 10;
  /** Нижняя граница 10-значного числа. */
  private static readonly _codeMin: number = 1_000_000_000;
  /** Диапазон 10-значных чисел. */
  private static readonly _codeRange: number = 9_000_000_000;
  /** TTL по умолчанию в днях (если INVITE_TTL_DAYS не задан). */
  private static readonly _defaultTtlDays: number = 7;

  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
    private readonly _config: ConfigService,
  ) {}

  /**
   * Создаёт инвайт-код с атомарным декрементом invites_remaining.
   * TTL берётся из env INVITE_TTL_DAYS (default 7).
   * @param accountId - ID создателя инвайта.
   * @returns Данные созданного инвайта.
   * @throws ForbiddenException если у аккаунта нет доступных инвайтов.
   */
  public async execute(accountId: string): Promise<CreateInviteResult> {
    const ttlDays = this._config.get<number>('INVITE_TTL_DAYS', CreateInviteUseCase._defaultTtlDays);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1_000);

    for (let i = 0; i < CreateInviteUseCase._maxCodeRetries; i++) {
      const code = this._generateCode();
      try {
        const row = await this._db.transaction(
          async (tx: DrizzleTransaction): Promise<typeof invites.$inferSelect> => {
            const updated = await tx
              .update(accounts)
              .set({ invitesRemaining: sql`${accounts.invitesRemaining} - 1` })
              .where(and(eq(accounts.id, accountId), gt(accounts.invitesRemaining, 0)))
              .returning({ invitesRemaining: accounts.invitesRemaining });

            if (updated.length === 0) {
              throw new ForbiddenException({
                code: ErrorCode.NO_INVITES_REMAINING,
                message: 'Нет доступных инвайтов',
              });
            }

            const inserted = await tx
              .insert(invites)
              .values({ id: generateId(), accountId, code, expiresAt })
              .returning();

            const invite = inserted[0];
            if (invite === undefined) {
              throw new Error('INSERT invite не вернул строк');
            }
            return invite;
          },
        );

        return {
          id: row.id,
          code: row.code,
          expires_at: row.expiresAt.toISOString(),
          created_at: row.createdAt.toISOString(),
        };
      } catch (err) {
        if (err instanceof DatabaseError && err.code === '23505') {
          continue;
        }
        throw err;
      }
    }

    throw new Error('Не удалось сгенерировать уникальный код приглашения');
  }

  /**
   * Генерирует случайный 10-значный числовой код.
   * @returns Строка из 10 цифр.
   */
  private _generateCode(): string {
    return String(Math.floor(Math.random() * CreateInviteUseCase._codeRange) + CreateInviteUseCase._codeMin);
  }
}
