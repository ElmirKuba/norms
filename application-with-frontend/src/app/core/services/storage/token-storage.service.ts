import { Injectable } from '@angular/core';

/** Хранит access и refresh токены текущей сессии в памяти процесса. */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  /** Текущий access-токен, null если сессия отсутствует. */
  private _accessToken: string | null = null;

  /** Текущий refresh-токен, null если сессия отсутствует. */
  private _refreshToken: string | null = null;

  /** Возвращает текущий access-токен или null. */
  public get accessToken(): string | null {
    return this._accessToken;
  }

  /** Возвращает текущий refresh-токен или null. */
  public get refreshToken(): string | null {
    return this._refreshToken;
  }

  /**
   * Сохраняет новую пару токенов.
   * @param accessToken - JWT access-токен.
   * @param refreshToken - Opaque refresh-токен.
   */
  public store(accessToken: string, refreshToken: string): void {
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
  }

  /** Удаляет токены (выход из сессии или кик). */
  public clear(): void {
    this._accessToken = null;
    this._refreshToken = null;
  }
}
