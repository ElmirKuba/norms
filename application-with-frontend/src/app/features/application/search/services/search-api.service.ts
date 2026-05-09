/* eslint-disable @typescript-eslint/naming-convention -- snake_case JSON */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api-config';

/** Один результат поиска аккаунта. */
export interface SearchResultItem {
  /** ID аккаунта. */
  readonly account_id: string;
  /** UIN или null если не назначен. */
  readonly uin: string | null;
  /** Username или null. */
  readonly username: string | null;
}
/* eslint-enable @typescript-eslint/naming-convention */

/** Палитра цветов для аватаров в поиске. */
const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#A855F7', '#F59E0B', '#10B981'];

/**
 * Детерминированный цвет аватара по ID аккаунта.
 * @param id - ID аккаунта.
 * @returns CSS-цвет из палитры.
 */
export function avatarColorForId(id: string): string {
  const code = id.charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length] ?? '#5856D6';
}

/** HTTP-клиент для GET /search. */
@Injectable({ providedIn: 'root' })
export class SearchApiService {
  /** HTTP-клиент для запросов. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /**
   * Ищет аккаунты по UIN (точный) или username (префикс, case-insensitive).
   * @param q - Строка запроса.
   * @param limit - Максимальное количество результатов (по умолчанию 20).
   * @returns Массив найденных аккаунтов.
   */
  public search(q: string, limit: number = 20): Observable<SearchResultItem[]> {
    return this._http.get<SearchResultItem[]>(
      `${this._baseUrl}/search?q=${encodeURIComponent(q)}&limit=${String(limit)}`,
    );
  }
}
