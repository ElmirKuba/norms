import { Injectable } from '@angular/core';

/** Ключ, обёрнутый мастер-ключом устройства (AES-GCM). Хранится в SQLite chat_keys. */
export interface CryptoWrappedKey {
  /** Зашифрованный ключ (base64). */
  readonly encryptedKey: string;
  /** IV шифрования (base64, 12 байт). */
  readonly keyIv: string;
}

const IV_LENGTH = 12;
const ECDH_ALGORITHM: EcKeyGenParams = { name: 'ECDH', namedCurve: 'X25519' };
const HKDF_PARAMS: HkdfParams = {
  name: 'HKDF',
  hash: 'SHA-256',
  salt: new Uint8Array(0),
  info: new TextEncoder().encode('normisy-chat-key-v1'),
};
const AES_KEY_ALGO: AesDerivedKeyParams = { name: 'AES-GCM', length: 256 };

/**
 * Криптографические примитивы для E2E шифрования чатов.
 *
 * Схема: ECDH X25519 → HKDF-SHA256 → AES-256-GCM.
 * Мастер-ключ устройства оборачивает ключи чата перед записью в SQLite.
 */
@Injectable({ providedIn: 'root' })
export class CryptoService {
  /**
   * Генерирует пару ECDH X25519 ключей.
   * @returns CryptoKeyPair (extractable, deriveBits).
   */
  public generateEcdhKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(ECDH_ALGORITHM, true, ['deriveBits']);
  }

  /**
   * Экспортирует публичный X25519 ключ в base64 (raw 32 байта).
   * @param key - Публичный CryptoKey.
   * @returns base64-строка для отправки на сервер.
   */
  public async exportPublicKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('raw', key);
    return this._ab2b64(raw);
  }

  /**
   * Импортирует публичный X25519 ключ из base64.
   * @param base64 - base64-строка (raw 32 байта) от сервера.
   * @returns Публичный CryptoKey.
   */
  public importPublicKey(base64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey('raw', this._b642ab(base64), ECDH_ALGORITHM, false, []);
  }

  /**
   * Выводит AES-256-GCM ключ через ECDH + HKDF-SHA256.
   *
   * Shared secret вычисляется из моего приватного и публичного ключа собеседника.
   * Из 32-байтного секрета через HKDF (info = "normisy-chat-key-v1") выводится AES-ключ.
   * @param myPrivateKey - Приватный ECDH ключ текущего устройства.
   * @param peerPublicKey - Публичный ECDH ключ собеседника.
   * @returns AES-256-GCM CryptoKey (extractable для wrap).
   */
  public async deriveAesKey(myPrivateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: peerPublicKey },
      myPrivateKey,
      256,
    );
    const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(HKDF_PARAMS, hkdfKey, AES_KEY_ALGO, true, ['encrypt', 'decrypt']);
  }

  /**
   * Оборачивает AES-ключ чата мастер-ключом устройства (AES-GCM, raw формат).
   * Результат сохраняется в SQLite chat_keys (encrypted_key + key_iv).
   * @param key - AES-256-GCM ключ чата.
   * @param masterKey - Мастер-ключ устройства.
   * @returns Зашифрованный ключ и IV (оба base64).
   */
  public wrapAesKey(
    key: CryptoKey,
    masterKey: CryptoKey,
  ): Promise<CryptoWrappedKey> {
    return this._wrapKey('raw', key, masterKey);
  }

  /**
   * Разворачивает AES-ключ чата из SQLite chat_keys.
   * @param encryptedKey - base64 зашифрованного ключа.
   * @param keyIv - base64 IV шифрования.
   * @param masterKey - Мастер-ключ устройства.
   * @returns AES-256-GCM CryptoKey.
   */
  public unwrapAesKey(encryptedKey: string, keyIv: string, masterKey: CryptoKey): Promise<CryptoKey> {
    const iv = this._b642ab(keyIv);
    return crypto.subtle.unwrapKey(
      'raw',
      this._b642ab(encryptedKey),
      masterKey,
      { name: 'AES-GCM', iv },
      AES_KEY_ALGO,
      true,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Оборачивает ECDH приватный ключ мастер-ключом устройства (pkcs8 + AES-GCM).
   * Хранится в SQLite в период pending_key — до получения публичного ключа собеседника.
   * @param key - Приватный ECDH CryptoKey.
   * @param masterKey - Мастер-ключ устройства.
   * @returns Зашифрованный ключ и IV (оба base64).
   */
  public wrapEcdhPrivateKey(
    key: CryptoKey,
    masterKey: CryptoKey,
  ): Promise<CryptoWrappedKey> {
    return this._wrapKey('pkcs8', key, masterKey);
  }

  /**
   * Разворачивает ECDH приватный ключ для деривации AES-ключа.
   * @param encryptedKey - base64 зашифрованного ключа.
   * @param keyIv - base64 IV шифрования.
   * @param masterKey - Мастер-ключ устройства.
   * @returns Приватный ECDH CryptoKey (deriveBits).
   */
  public unwrapEcdhPrivateKey(encryptedKey: string, keyIv: string, masterKey: CryptoKey): Promise<CryptoKey> {
    const iv = this._b642ab(keyIv);
    return crypto.subtle.unwrapKey(
      'pkcs8',
      this._b642ab(encryptedKey),
      masterKey,
      { name: 'AES-GCM', iv },
      ECDH_ALGORITHM,
      true,
      ['deriveBits'],
    );
  }

  /**
   * Шифрует текст AES-256-GCM.
   * Blob-формат: [iv: 12 байт][ciphertext + auth_tag: N + 16 байт].
   * @param text - Открытый текст.
   * @param aesKey - AES-256-GCM CryptoKey.
   * @returns base64 blob для передачи по WSS.
   */
  public async encrypt(text: string, aesKey: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const cipherWithTag = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      new TextEncoder().encode(text),
    );
    const blob = new Uint8Array(IV_LENGTH + cipherWithTag.byteLength);
    blob.set(iv, 0);
    blob.set(new Uint8Array(cipherWithTag), IV_LENGTH);
    return this._ab2b64(blob.buffer);
  }

  /**
   * Расшифровывает AES-256-GCM blob в текст.
   * Ожидает base64 формата [iv: 12 байт][ciphertext + auth_tag].
   * @param base64Blob - base64 blob из WSS.
   * @param aesKey - AES-256-GCM CryptoKey.
   * @returns Расшифрованный текст.
   */
  public async decrypt(base64Blob: string, aesKey: CryptoKey): Promise<string> {
    const blob = this._b642ab(base64Blob);
    const iv = blob.slice(0, IV_LENGTH);
    const cipherWithTag = blob.slice(IV_LENGTH);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      cipherWithTag,
    );
    return new TextDecoder().decode(plaintext);
  }

  /**
   * Оборачивает CryptoKey мастер-ключом AES-GCM, возвращает зашифрованный blob и IV.
   * @param format - 'raw' для AES-ключа, 'pkcs8' для ECDH приватного ключа.
   * @param key - Ключ для оборачивания.
   * @param masterKey - Мастер-ключ устройства.
   * @returns Зашифрованный ключ и IV (оба base64).
   */
  private async _wrapKey(
    format: 'pkcs8' | 'raw',
    key: CryptoKey,
    masterKey: CryptoKey,
  ): Promise<CryptoWrappedKey> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const wrapped = await crypto.subtle.wrapKey(format, key, masterKey, { name: 'AES-GCM', iv });
    return { encryptedKey: this._ab2b64(wrapped), keyIv: this._ab2b64(iv.buffer) };
  }

  /**
   * Конвертирует ArrayBuffer в base64-строку.
   * @param buf - ArrayBuffer.
   * @returns base64-строка.
   */
  private _ab2b64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return btoa(binary);
  }

  /**
   * Конвертирует base64-строку в Uint8Array.
   * @param b64 - base64-строка.
   * @returns Uint8Array.
   */
  private _b642ab(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) & 0xff;
    }
    return bytes;
  }
}
