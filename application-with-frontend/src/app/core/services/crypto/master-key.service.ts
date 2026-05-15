import { inject, Injectable } from '@angular/core';

import { SecureStorageService } from '../secure-storage/secure-storage.service';

const STORAGE_KEY = 'crypto.master_key';

/**
 * Управляет мастер-ключом устройства (AES-256-GCM).
 * Мастер-ключ хранится в SecureStorage (Keychain/Keystore).
 * Используется для оборачивания (wrap/unwrap) ключей чатов перед записью в SQLite.
 */
@Injectable({ providedIn: 'root' })
export class MasterKeyService {
  private readonly _storage: SecureStorageService = inject(SecureStorageService);

  /** In-memory кэш — импортируем ключ один раз за сессию. */
  private _cachedKey: CryptoKey | null = null;

  /**
   * Возвращает мастер-ключ устройства. Генерирует и сохраняет, если отсутствует.
   * @returns CryptoKey (AES-256-GCM, non-extractable, encrypt/decrypt).
   */
  public async getOrCreate(): Promise<CryptoKey> {
    if (this._cachedKey !== null) return this._cachedKey;

    let raw = await this._storage.get(STORAGE_KEY);

    if (raw === null) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      raw = btoa(String.fromCharCode(...Array.from(bytes)));
      await this._storage.set(STORAGE_KEY, raw);
    }

    const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    this._cachedKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
    );

    return this._cachedKey;
  }
}
