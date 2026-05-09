import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import type { AccountSearchResult } from '../../domain/entities/account.entity';

/** Максимальный лимит результатов поиска. */
const MAX_LIMIT = 50;

/** Форма одного результата поиска в ответе API. */
interface SearchResultItem {
  /** ID аккаунта. */
  /* eslint-disable @typescript-eslint/naming-convention -- snake_case JSON */
  readonly account_id: string;
  /** UIN или null. */
  readonly uin: string | null;
  /** Username или null. */
  readonly username: string | null;
  /* eslint-enable @typescript-eslint/naming-convention */
}

/** Use-case поиска аккаунтов по UIN или username. */
@Injectable()
export class SearchUseCase {
  public constructor(private readonly _accountRepo: AccountRepository) {}

  /**
   * Ищет аккаунты по строке запроса. Если первый символ — цифра, точный поиск по UIN.
   * Иначе — поиск по префиксу username (case-insensitive через CITEXT).
   * @param q - Строка запроса.
   * @param limit - Максимальное количество результатов (не более 50).
   * @returns Массив найденных аккаунтов.
   */
  public async execute(q: string, limit: number): Promise<SearchResultItem[]> {
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const results: AccountSearchResult[] = await this._accountRepo.search(q, safeLimit);
    return results.map((r: AccountSearchResult): SearchResultItem => ({
      account_id: r.accountId,
      uin: r.uin,
      username: r.username,
    }));
  }
}
