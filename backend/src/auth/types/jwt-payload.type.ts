import type { Platform } from '../../common/types/platform.type';

/** Payload JWT access-токена. */
export interface JwtPayload {
  /** ID аккаунта (subject). */
  readonly sub: string;
  /** ID сессии. */
  readonly sessionId: string;
  /** Платформа устройства. */
  readonly platform: Platform;
  /** Флаг администратора. */
  readonly isAdmin: boolean;
}
