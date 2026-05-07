import { Injectable, Inject, BadRequestException, ForbiddenException } from '@nestjs/common';
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
  /** Минимальный TTL в миллисекундах (1 час). */
  private static readonly _minTtlMs: number = 60 * 60 * 1_000;
  /** Максимальный TTL в миллисекундах (30 дней). */
  private static readonly _maxTtlMs: number = 30 * 24 * 60 * 60 * 1_000;
  /** Максимальное количество попыток при коллизии кода. */
  private static readonly _maxCodeRetries: number = 10;
  /** Нижняя граница 10-значного числа. */
  private static readonly _codeMin: number = 1_000_000_000;
  /** Диапазон 10-значных чисел. */
  private static readonly _codeRange: number = 9_000_000_000;

  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {}

  /**
   * Создаёт инвайт-код с атомарным декрементом invites_remaining.
   * @param accountId - ID создателя инвайта.
   * @param expiresAt - Дата истечения кода.
   * @returns Данные созданного инвайта.
   * @throws BadRequestException если expires_at не укладывается в допустимый диапазон.
   * @throws ForbiddenException если у аккаунта нет доступных инвайтов.
   */
  public async execute(accountId: string, expiresAt: Date): Promise<CreateInviteResult> {
    const ttl = expiresAt.getTime() - Date.now();
    if (ttl < CreateInviteUseCase._minTtlMs) {
      throw new BadRequestException({ code: 'expires_at_too_soon', message: 'Минимальный TTL — 1 час' });
    }
    if (ttl > CreateInviteUseCase._maxTtlMs) {
      throw new BadRequestException({ code: 'expires_at_too_far', message: 'Максимальный TTL — 30 дней' });
    }

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
                code: 'no_invites_remaining',
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
