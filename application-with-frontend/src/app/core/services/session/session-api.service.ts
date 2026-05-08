import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../api/api-config';

/* eslint-disable @typescript-eslint/naming-convention -- API использует snake_case */
/** Ответ POST /session/refresh. */
export interface RefreshTokenResponse {
  /** Новый JWT access-токен. */
  readonly access_token: string;
  /** Новый opaque refresh-токен (старый инвалидируется). */
  readonly refresh_token: string;
}

/** Одна сессия в ответе GET /session/read-list. */
export interface ApiSession {
  /** ID сессии. */
  readonly id: string;
  /** Системное имя устройства. */
  readonly system_name: string;
  /** Прозвище сессии (установленное пользователем) или null. */
  readonly nickname: string | null;
  /** Платформа. */
  readonly platform: string;
  /** true — текущая сессия. */
  readonly is_current: boolean;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
  /** ISO-8601 дата последнего обновления (используется как «последний вход»). */
  readonly updated_at: string;
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

  /**
   * Возвращает все сессии текущего аккаунта (GET /session/read-list).
   * @returns Массив сессий с флагом is_current.
   */
  public readList(): Observable<ApiSession[]> {
    return this._http.get<ApiSession[]>(`${this._baseUrl}/session/read-list`);
  }

  /**
   * Кикает сессию по ID (DELETE /session/delete/:id).
   * @param id - ID сессии.
   * @returns Пустой Observable (204).
   * @throws HttpErrorResponse 404 если сессия не найдена.
   * @throws HttpErrorResponse 403 если сессия принадлежит другому аккаунту.
   */
  public deleteById(id: string): Observable<unknown> {
    return this._http.delete(`${this._baseUrl}/session/delete/${id}`);
  }

  /**
   * Устанавливает прозвище текущей сессии (PATCH /session/update-nickname).
   * @param nickname - Прозвище или null для снятия.
   * @returns Пустой Observable (204).
   */
  public updateNickname(nickname: string | null): Observable<unknown> {
    return this._http.patch(`${this._baseUrl}/session/update-nickname`, { nickname });
  }
}
