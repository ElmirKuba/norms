/* eslint-disable @typescript-eslint/naming-convention -- snake_case JSON */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api-config';

/** Тело запроса PATCH /account/update. */
export interface UpdateAccountRequest {
  /** Новый псевдоним или null чтобы удалить. */
  readonly nickname?: string | null;
  /** Текущий пароль — обязателен при смене пароля. */
  readonly current_password?: string;
  /** Новый пароль — минимум 8 символов. */
  readonly new_password?: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

/** HTTP-клиент для PATCH /account/update. */
@Injectable({ providedIn: 'root' })
export class AccountApiService {
  /** HTTP-клиент для запросов. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /**
   * Обновляет аккаунт: псевдоним и/или пароль (PATCH /account/update).
   * @param data - Поля для обновления.
   * @returns Пустой Observable.
   */
  public updateAccount(data: UpdateAccountRequest): Observable<unknown> {
    return this._http.patch(`${this._baseUrl}/account/update`, data);
  }

  /**
   * Удаляет аккаунт и все связанные данные (DELETE /account/delete).
   * @returns Пустой Observable (204).
   */
  public deleteAccount(): Observable<unknown> {
    return this._http.delete(`${this._baseUrl}/account/delete`);
  }
}
