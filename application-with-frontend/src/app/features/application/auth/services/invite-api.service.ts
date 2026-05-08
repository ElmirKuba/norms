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

/** Инвайт-код в ответах create / read-list. */
export interface InviteCode {
  /** ID записи. */
  readonly id: string;
  /** 10-значный код без дефисов. */
  readonly code: string;
  /** ISO-8601 дата истечения. */
  readonly expires_at: string;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}

/** Один участник реферальной пары. */
export interface ReferralPerson {
  /** ID аккаунта. */
  readonly account_id: string;
  /** UIN или null (не назначен). */
  readonly uin: string | null;
  /** Username или null. */
  readonly username: string | null;
  /** ISO-8601 дата регистрации. */
  readonly joined_at: string;
}

/** Ответ GET /invite/read-referrals. */
export interface ReadReferralsResponse {
  /** Кто пригласил меня (null — свободная регистрация или аккаунт удалён). */
  readonly inviter: ReferralPerson | null;
  /** Кого пригласил я. */
  readonly invitees: readonly ReferralPerson[];
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

  /**
   * Создаёт инвайт-код (POST /invite/create).
   * @returns Созданный код с TTL от сервера.
   * @throws HttpErrorResponse 403 если нет доступных инвайтов.
   */
  public create(): Observable<InviteCode> {
    return this._http.post<InviteCode>(`${this._baseUrl}/invite/create`, {});
  }

  /**
   * Отзывает инвайт-код (DELETE /invite/revoke/:id).
   * @param id - ID кода.
   * @returns Пустой Observable (204).
   */
  public revoke(id: string): Observable<unknown> {
    return this._http.delete(`${this._baseUrl}/invite/revoke/${id}`);
  }

  /**
   * Список активных инвайт-кодов (GET /invite/read-list).
   * @returns Массив активных кодов.
   */
  public readList(): Observable<InviteCode[]> {
    return this._http.get<InviteCode[]>(`${this._baseUrl}/invite/read-list`);
  }

  /**
   * Реферальная информация (GET /invite/read-referrals).
   * @returns Кто пригласил + кого пригласил.
   */
  public readReferrals(): Observable<ReadReferralsResponse> {
    return this._http.get<ReadReferralsResponse>(`${this._baseUrl}/invite/read-referrals`);
  }
}
