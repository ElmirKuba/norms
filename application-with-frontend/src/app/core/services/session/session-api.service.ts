import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../api/api-config';

/* eslint-disable @typescript-eslint/naming-convention -- API использует snake_case */
/** Ответ POST /session/refresh-token. */
export interface RefreshTokenResponse {
  /** Новый JWT access-токен. */
  readonly access_token: string;
  /** Новый opaque refresh-токен (старый инвалидируется). */
  readonly refresh_token: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

/** HTTP-клиент для эндпоинтов /session/*. */
@Injectable({ providedIn: 'root' })
export class SessionApiService {
  /** HTTP-клиент для запросов. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /**
   * Ротирует refresh-токен и возвращает новую пару (POST /session/refresh-token).
   * Старый refresh-токен инвалидируется немедленно.
   * @param refreshToken - Текущий opaque refresh-токен.
   * @returns Новая пара токенов.
   * @throws HttpErrorResponse 401 если токен невалиден или уже использован.
   */
  public refresh(refreshToken: string): Observable<RefreshTokenResponse> {
    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    return this._http.post<RefreshTokenResponse>(`${this._baseUrl}/session/refresh`, {
      refresh_token: refreshToken,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}
