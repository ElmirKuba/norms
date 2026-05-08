import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api-config';

/** Ответ GET /uin/read-status. */
export interface UinStatusResponse {
  /** Статус генерации UIN. */
  readonly status: 'pending' | 'assigned';
  /** Номер UIN или null если ещё не назначен. */
  readonly uin: string | null;
}

/** HTTP-клиент для эндпоинтов /uin/*. */
@Injectable({ providedIn: 'root' })
export class UinApiService {
  /** HTTP-клиент для запросов. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /**
   * Возвращает статус генерации UIN текущего аккаунта (GET /uin/read-status).
   * Bearer-токен добавляется автоматически через authInterceptor.
   * @returns Статус UIN и его значение если уже назначен.
   */
  public readStatus(): Observable<UinStatusResponse> {
    return this._http.get<UinStatusResponse>(`${this._baseUrl}/uin/read-status`);
  }
}
