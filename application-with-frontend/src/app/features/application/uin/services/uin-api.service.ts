import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api-config';
import { TokenStorageService } from '../../../../core/services/storage/token-storage.service';

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

  /** Хранилище токенов — Bearer-заголовок формируется вручную до появления интерцептора. */
  private readonly _tokenStorage: TokenStorageService = inject(TokenStorageService);

  /**
   * Возвращает статус генерации UIN текущего аккаунта (GET /uin/read-status).
   * @returns Статус UIN и его значение если уже назначен.
   */
  public readStatus(): Observable<UinStatusResponse> {
    const token = this._tokenStorage.accessToken;
    /* eslint-disable @typescript-eslint/naming-convention -- HTTP-заголовок Authorization использует PascalCase */
    const headers = token !== null ? { Authorization: `Bearer ${token}` } : {};
    /* eslint-enable @typescript-eslint/naming-convention */
    return this._http.get<UinStatusResponse>(`${this._baseUrl}/uin/read-status`, { headers });
  }
}
