import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountRepository } from '../../domain/ports/account.repository.port';

/** Форма ответа для своего аккаунта. */
interface ReadOwnAccountResult {
  /** ID аккаунта. */
  readonly id: string;
  /** UIN или null если не назначен. */
  readonly uin: string | null;
  /** Юзернейм или null. */
  readonly username: string | null;
  /** Количество оставшихся инвайтов. */
  readonly invites_remaining: number;
  /** Флаг администратора. */
  readonly is_admin: boolean;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}

/** Форма ответа для чужого аккаунта. */
interface ReadOtherAccountResult {
  /** ID аккаунта. */
  readonly id: string;
  /** UIN или null если не назначен. */
  readonly uin: string | null;
  /** Юзернейм или null. */
  readonly username: string | null;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}

/** Форма ответа метода execute. */
export type ReadAccountResult = ReadOwnAccountResult | ReadOtherAccountResult;

/** Use-case чтения данных аккаунта (своего или чужого). */
@Injectable()
export class ReadAccountUseCase {
  public constructor(private readonly _accountRepo: AccountRepository) {}

  /**
   * Возвращает данные аккаунта. Для своего — полный профиль с invites_remaining и is_admin.
   * @param requesterId - ID аккаунта из JWT (текущий пользователь).
   * @param targetId - ID запрашиваемого аккаунта (если null — свой).
   * @returns Данные аккаунта.
   * @throws NotFoundException если чужой аккаунт не найден.
   */
  public async execute(requesterId: string, targetId: string | null): Promise<ReadAccountResult> {
    const isSelf = targetId === null || targetId === requesterId;
    const accountId = isSelf ? requesterId : targetId;

    const [account, uin] = await Promise.all([
      this._accountRepo.findById(accountId),
      this._accountRepo.findUinByAccountId(accountId),
    ]);

    if (account === null) {
      throw new NotFoundException({ code: 'account_not_found', message: 'Аккаунт не найден' });
    }

    if (isSelf) {
      return {
        id: account.id,
        uin,
        username: account.username,
        invites_remaining: account.invitesRemaining,
        is_admin: account.isAdmin,
        created_at: account.createdAt.toISOString(),
      };
    }

    return {
      id: account.id,
      uin,
      username: account.username,
      created_at: account.createdAt.toISOString(),
    };
  }
}
