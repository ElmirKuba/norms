import { Injectable, inject } from '@angular/core';
import { SecureStorageService } from '../secure-storage/secure-storage.service';

/** Ключи в SecureStorage. */
const KEYS = {
  accessToken: 'auth.access_token',
  refreshToken: 'auth.refresh_token',
} as const;

/**
 * Хранит пару токенов текущей сессии.
 * In-memory для синхронного доступа (интерцептор); персистентность — через SecureStorageService.
 * Вызвать loadFromStorage() при старте приложения (APP_INITIALIZER).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  /** Текущий access-токен или null. */
  private _accessToken: string | null = null;

  /** Текущий refresh-токен или null. */
  private _refreshToken: string | null = null;

  /** Платформенное защищённое хранилище (OS keychain). */
  private readonly _secureStorage: SecureStorageService = inject(SecureStorageService);

  /** Возвращает текущий access-токен или null. */
  public get accessToken(): string | null {
    return this._accessToken;
  }

  /** Возвращает текущий refresh-токен или null. */
  public get refreshToken(): string | null {
    return this._refreshToken;
  }

  /**
   * Читает токены из защищённого хранилища в память.
   * Вызывается один раз через APP_INITIALIZER до монтирования компонентов.
   */
  public async loadFromStorage(): Promise<void> {
    const [access, refresh] = await Promise.all([
      this._secureStorage.get(KEYS.accessToken),
      this._secureStorage.get(KEYS.refreshToken),
    ]);
    this._accessToken = access;
    this._refreshToken = refresh;
  }

  /**
   * Сохраняет новую пару токенов в памяти и в защищённом хранилище.
   * @param accessToken - JWT access-токен.
   * @param refreshToken - Opaque refresh-токен.
   */
  public store(accessToken: string, refreshToken: string): void {
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
    void this._secureStorage.set(KEYS.accessToken, accessToken);
    void this._secureStorage.set(KEYS.refreshToken, refreshToken);
  }

  /** Удаляет токены из памяти и из защищённого хранилища (выход/кик). */
  public clear(): void {
    this._accessToken = null;
    this._refreshToken = null;
    void this._secureStorage.remove(KEYS.accessToken);
    void this._secureStorage.remove(KEYS.refreshToken);
  }
}
