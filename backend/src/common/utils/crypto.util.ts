import { randomBytes, createHash } from 'crypto';

/** Пара refresh-токен (клиент) + SHA-256 хеш (БД). */
interface RefreshTokenPair {
  /** Opaque base64url токен для выдачи клиенту. */
  readonly raw: string;
  /** SHA-256 hex-хеш для хранения в БД. */
  readonly hash: string;
}

/**
 * Генерирует opaque refresh-токен и его SHA-256 хеш для хранения в БД.
 * @returns Пара: сырой токен (для клиента) и хеш (для БД).
 */
export function generateRefreshToken(): RefreshTokenPair {
  const raw = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

/**
 * Возвращает SHA-256 hex-хеш строки.
 * @param value - Входная строка.
 * @returns SHA-256 хеш в hex-формате (64 символа).
 */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
