import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import type { AccountEntity } from '../../domain/entities/account.entity';

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

/** Параметры поиска целевого аккаунта. */
export interface ReadAccountQuery {
  /** Поиск по ID аккаунта. */
  readonly id?: string;
  /** Поиск по UIN. */
  readonly uin?: string;
}

/** Use-case чтения данных аккаунта (своего или чужого, по ID или UIN). */
@Injectable()
export class ReadAccountUseCase {
  public constructor(private readonly _accountRepo: AccountRepository) {}

  /**
   * Возвращает данные аккаунта. Для своего — полный профиль с invites_remaining и is_admin.
   * @param requesterId - ID аккаунта из JWT (текущий пользователь).
   * @param query - Параметры поиска (id или uin). Если оба пусты — свой аккаунт.
   * @returns Данные аккаунта.
   * @throws BadRequestException если переданы одновременно id и uin.
   * @throws NotFoundException если аккаунт не найден.
   */
  public async execute(requesterId: string, query: ReadAccountQuery): Promise<ReadAccountResult> {
    if (query.id !== undefined && query.uin !== undefined) {
      throw new BadRequestException({ code: 'ambiguous_query', message: 'Передайте либо id, либо uin, но не оба' });
    }

    let account: AccountEntity | null;

    if (query.uin !== undefined) {
      account = await this._accountRepo.findByUin(query.uin);
    } else if (query.id !== undefined) {
      account = await this._accountRepo.findById(query.id);
    } else {
      account = await this._accountRepo.findById(requesterId);
    }

    if (account === null) {
      throw new NotFoundException({ code: 'account_not_found', message: 'Аккаунт не найден' });
    }

    const uin = await this._accountRepo.findUinByAccountId(account.id);
    const isSelf = account.id === requesterId;

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
