import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api-config';

/* eslint-disable @typescript-eslint/naming-convention -- API использует snake_case */
/** Ответ на проверку инвайт-кода. */
export interface CheckInviteResponse {
  /** ISO-8601 дата истечения кода. */
  readonly expires_at: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

/** HTTP-клиент для эндпоинтов /invite/*. */
@Injectable({ providedIn: 'root' })
export class InviteApiService {
  /** HTTP-клиент для запросов. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /**
   * Проверяет инвайт-код без потребления (POST /invite/check).
   * @param code - 10-значный код без дефисов.
   * @returns expires_at кода в ISO-8601.
   * @throws HttpErrorResponse 404 если код не найден или истёк.
   * @throws HttpErrorResponse 429 если превышен лимит проверок с IP.
   */
  public checkCode(code: string): Observable<CheckInviteResponse> {
    return this._http.post<CheckInviteResponse>(`${this._baseUrl}/invite/check`, { code });
  }
}
