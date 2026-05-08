import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api-config';

/** Платформа устройства — значения принимаемые бэкендом. */
export type ApiPlatform = 'ios' | 'android' | 'electron';

/* eslint-disable @typescript-eslint/naming-convention -- API использует snake_case */
/** Тело запроса POST /account/create. */
export interface CreateAccountRequest {
  /** Пароль в открытом виде. */
  readonly password: string;
  /** 10-значный инвайт-код без дефисов. Обязателен когда free_registration=false. */
  readonly invite_code?: string;
  /** Системное имя устройства, например «iPhone 14 Pro» или «Mac». */
  readonly system_name: string;
  /** Платформа устройства. */
  readonly platform: ApiPlatform;
}

/** Данные аккаунта в ответе на регистрацию. */
export interface CreateAccountResponseAccount {
  /** ID аккаунта. */
  readonly id: string;
  /** UIN — null до асинхронного назначения. */
  readonly uin: null;
  /** Юзернейм или null. */
  readonly username: string | null;
  /** Начальный лимит инвайтов. */
  readonly invites_remaining: number;
  /** ISO-8601 дата регистрации. */
  readonly created_at: string;
}

/** Данные сессии в ответе на регистрацию и авторизацию. */
export interface AccountResponseSession {
  /** ID сессии. */
  readonly id: string;
  /** Системное имя устройства. */
  readonly system_name: string;
  /** Платформа. */
  readonly platform: ApiPlatform;
  /** JWT access-токен. */
  readonly access_token: string;
  /** Opaque refresh-токен (возвращается один раз). */
  readonly refresh_token: string;
}

/** Ответ POST /account/create. */
export interface CreateAccountResponse {
  /** Данные созданного аккаунта. */
  readonly account: CreateAccountResponseAccount;
  /** Данные сессии с токенами. */
  readonly session: AccountResponseSession;
}

/** Тело запроса POST /account/auth. */
export interface AuthAccountRequest {
  /** UIN (цифры) или username. */
  readonly login: string;
  /** Пароль в открытом виде. */
  readonly password: string;
  /** Системное имя устройства. */
  readonly system_name: string;
  /** Платформа устройства. */
  readonly platform: ApiPlatform;
}

/** Данные аккаунта в ответе на авторизацию. */
export interface AuthAccountResponseAccount {
  /** ID аккаунта. */
  readonly id: string;
  /** UIN или null если ещё не назначен. */
  readonly uin: string | null;
  /** Юзернейм или null. */
  readonly username: string | null;
  /** Количество оставшихся инвайтов. */
  readonly invites_remaining: number;
}

/** Ответ POST /account/auth. */
export interface AuthAccountResponse {
  /** Данные аккаунта. */
  readonly account: AuthAccountResponseAccount;
  /** Данные сессии с токенами. */
  readonly session: AccountResponseSession;
}
/* eslint-enable @typescript-eslint/naming-convention */

/** HTTP-клиент для эндпоинтов /account/*. */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  /** HTTP-клиент для запросов. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /**
   * Регистрирует новый аккаунт (POST /account/create).
   * @param data - Данные регистрации.
   * @returns Данные аккаунта и токены сессии.
   * @throws HttpErrorResponse 400 если инвайт не передан а регистрация закрытая.
   * @throws HttpErrorResponse 404 если инвайт-код не найден.
   * @throws HttpErrorResponse 410 если инвайт-код истёк.
   * @throws HttpErrorResponse 409 если инвайт-код уже использован (race condition).
   */
  public createAccount(data: CreateAccountRequest): Observable<CreateAccountResponse> {
    return this._http.post<CreateAccountResponse>(`${this._baseUrl}/account/create`, data);
  }

  /**
   * Авторизует пользователя по UIN/username + пароль (POST /account/auth).
   * @param data - Данные входа.
   * @returns Данные аккаунта и токены сессии.
   * @throws HttpErrorResponse 401 если логин или пароль неверны.
   * @throws HttpErrorResponse 403 если достигнут лимит устройств.
   * @throws HttpErrorResponse 423 если превышен лимит попыток входа.
   */
  public authAccount(data: AuthAccountRequest): Observable<AuthAccountResponse> {
    return this._http.post<AuthAccountResponse>(`${this._baseUrl}/account/auth`, data);
  }
}
