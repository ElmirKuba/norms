import { Injectable } from '@angular/core';

/** Ключ, обёрнутый мастер-ключом устройства (AES-GCM). Хранится в SQLite chat_keys. */
export interface CryptoWrappedKey {
  /** Зашифрованный ключ (base64). */
  readonly encryptedKey: string;
  /** IV шифрования (base64, 12 байт). */
  readonly keyIv: string;
}

/** Результат расшифровки сообщения в новом формате (с рачет-заголовком). */
export interface DecryptedMessage {
  /** Расшифрованный текст сообщения. */
  readonly content: string;
  /**
   * Рачет-публичный ключ собеседника из заголовка (base64).
   * null если сообщение не содержит рачет-ключа.
   */
  readonly peerRatchetPubKeyBase64: string | null;
}

const IV_LENGTH = 12;
const RATCHET_PUBKEY_LENGTH = 32;
const BLOB_FLAG_NO_RATCHET = 0x00;
const BLOB_FLAG_HAS_RATCHET_KEY = 0x01;

const ECDH_ALGORITHM: EcKeyGenParams = { name: 'ECDH', namedCurve: 'X25519' };

/** HKDF-параметры для начального AES-ключа (initial ECDH exchange). */
const INITIAL_HKDF_PARAMS: HkdfParams = {
  name: 'HKDF',
  hash: 'SHA-256',
  salt: new Uint8Array(0),
  info: new TextEncoder().encode('normisy-chat-key-v1'),
};

/**
 * HKDF-параметры для рачет-шагов (Double Ratchet).
 * Отдельный info-контекст гарантирует domain separation от начального обмена.
 */
const RATCHET_HKDF_PARAMS: HkdfParams = {
  name: 'HKDF',
  hash: 'SHA-256',
  salt: new Uint8Array(0),
  info: new TextEncoder().encode('normisy-ratchet-v1'),
};

const AES_KEY_ALGO: AesDerivedKeyParams = { name: 'AES-GCM', length: 256 };

/**
 * Криптографические примитивы для E2E шифрования чатов.
 *
 * Схема: ECDH X25519 → HKDF-SHA256 → AES-256-GCM.
 * Double Ratchet: DH-шаг при каждом новом рачет-ключе собеседника.
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
   * @returns base64-строка для отправки на сервер или хранения в SQLite.
   */
  public async exportPublicKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey('raw', key);
    return this._ab2b64(raw);
  }

  /**
   * Импортирует публичный X25519 ключ из base64.
   * @param base64 - base64-строка (raw 32 байта).
   * @returns Публичный CryptoKey.
   */
  public importPublicKey(base64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey('raw', this._b642ab(base64), ECDH_ALGORITHM, false, []);
  }

  /**
   * Выводит начальный AES-256-GCM ключ через ECDH + HKDF-SHA256 (normisy-chat-key-v1).
   * Используется только при первичном обмене ключами (создание чата).
   * @param myPrivateKey - Приватный ECDH ключ текущего устройства.
   * @param peerPublicKey - Публичный ECDH ключ собеседника.
   * @returns AES-256-GCM CryptoKey (extractable).
   */
  public async deriveAesKey(myPrivateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: peerPublicKey },
      myPrivateKey,
      256,
    );
    const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(INITIAL_HKDF_PARAMS, hkdfKey, AES_KEY_ALGO, true, ['encrypt', 'decrypt']);
  }

  /**
   * Выводит рачет-AES-ключ через ECDH + HKDF-SHA256 (normisy-ratchet-v1).
   * Используется при каждом DH-рачет-шаге для получения нового симметричного ключа.
   * Domain-separated от начального обмена через отдельный HKDF info-контекст.
   * @param myRatchetPrivateKey - Текущий рачет-приватный ключ устройства.
   * @param peerRatchetPublicKey - Новый рачет-публичный ключ собеседника.
   * @returns AES-256-GCM CryptoKey (extractable).
   */
  public async deriveRatchetAesKey(myRatchetPrivateKey: CryptoKey, peerRatchetPublicKey: CryptoKey): Promise<CryptoKey> {
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: peerRatchetPublicKey },
      myRatchetPrivateKey,
      256,
    );
    const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(RATCHET_HKDF_PARAMS, hkdfKey, AES_KEY_ALGO, true, ['encrypt', 'decrypt']);
  }

  /**
   * Оборачивает AES-ключ чата мастер-ключом устройства (AES-GCM, raw формат).
   * Результат сохраняется в SQLite chat_keys (encrypted_key + key_iv).
   * @param key - AES-256-GCM ключ чата.
   * @param masterKey - Мастер-ключ устройства.
   * @returns Зашифрованный ключ и IV (оба base64).
   */
  public wrapAesKey(key: CryptoKey, masterKey: CryptoKey): Promise<CryptoWrappedKey> {
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
   * Используется для хранения рачет-приватных ключей и начального ключа обмена в SQLite.
   * @param key - Приватный ECDH CryptoKey.
   * @param masterKey - Мастер-ключ устройства.
   * @returns Зашифрованный ключ и IV (оба base64).
   */
  public wrapEcdhPrivateKey(key: CryptoKey, masterKey: CryptoKey): Promise<CryptoWrappedKey> {
    return this._wrapKey('pkcs8', key, masterKey);
  }

  /**
   * Разворачивает ECDH приватный ключ для деривации AES-ключа или рачет-шага.
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
   * Шифрует текст AES-256-GCM в новом формате с рачет-заголовком.
   *
   * Формат blob: [flags:1][ratchet_pub:32, только если flags=0x01][iv:12][ciphertext+tag].
   * Весь blob base64-кодируется для передачи по WSS.
   * @param text - Открытый текст сообщения.
   * @param aesKey - AES-256-GCM CryptoKey.
   * @param ratchetPubKeyBase64 - Рачет-публичный ключ устройства (base64) или null если нет.
   * @returns base64 blob для передачи по WSS.
   */
  public async encryptMessage(
    text: string,
    aesKey: CryptoKey,
    ratchetPubKeyBase64: string | null,
  ): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const cipherWithTag = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      new TextEncoder().encode(text),
    );

    const hasRatchetKey = ratchetPubKeyBase64 !== null;
    const headerLen = 1 + (hasRatchetKey ? RATCHET_PUBKEY_LENGTH : 0);
    const blob = new Uint8Array(headerLen + IV_LENGTH + cipherWithTag.byteLength);

    blob[0] = hasRatchetKey ? BLOB_FLAG_HAS_RATCHET_KEY : BLOB_FLAG_NO_RATCHET;
    if (ratchetPubKeyBase64 !== null) {
      blob.set(this._b642ab(ratchetPubKeyBase64), 1);
    }
    blob.set(iv, headerLen);
    blob.set(new Uint8Array(cipherWithTag), headerLen + IV_LENGTH);

    return this._ab2b64(blob.buffer);
  }

  /**
   * Расшифровывает AES-256-GCM blob в новом формате с рачет-заголовком.
   *
   * Ожидает формат: [flags:1][ratchet_pub:32, если flags=0x01][iv:12][ciphertext+tag].
   * @param base64Blob - base64 blob из WSS.
   * @param aesKey - AES-256-GCM CryptoKey.
   * @returns Расшифрованный текст и рачет-публичный ключ собеседника (или null).
   * @throws DOMException при неверном ключе или повреждённом blob.
   */
  public async decryptMessage(base64Blob: string, aesKey: CryptoKey): Promise<DecryptedMessage> {
    const blob = this._b642ab(base64Blob);
    const flags = blob[0] ?? BLOB_FLAG_NO_RATCHET;
    const hasRatchetKey = (flags & BLOB_FLAG_HAS_RATCHET_KEY) !== 0;
    const headerLen = 1 + (hasRatchetKey ? RATCHET_PUBKEY_LENGTH : 0);

    const peerRatchetPubKeyBase64 = hasRatchetKey
      ? this._ab2b64(blob.slice(1, 1 + RATCHET_PUBKEY_LENGTH).buffer)
      : null;

    const iv = blob.slice(headerLen, headerLen + IV_LENGTH);
    const cipherWithTag = blob.slice(headerLen + IV_LENGTH);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      cipherWithTag,
    );

    return { content: new TextDecoder().decode(plaintext), peerRatchetPubKeyBase64 };
  }

  /**
   * Извлекает рачет-публичный ключ из заголовка blob без расшифровки.
   * Используется для опережающего определения рачет-шага при ошибке текущего ключа.
   * @param base64Blob - base64 blob в новом формате.
   * @returns base64 рачет-ключа собеседника или null если ключа нет.
   */
  public parseRatchetPubKey(base64Blob: string): string | null {
    const blob = this._b642ab(base64Blob);
    if (blob.byteLength < 1) return null;
    const flags = blob[0] ?? BLOB_FLAG_NO_RATCHET;
    if ((flags & BLOB_FLAG_HAS_RATCHET_KEY) === 0) return null;
    if (blob.byteLength < 1 + RATCHET_PUBKEY_LENGTH) return null;
    return this._ab2b64(blob.slice(1, 1 + RATCHET_PUBKEY_LENGTH).buffer);
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
