/** Payload JWT access-токена. */
export interface JwtPayload {
  /** ID аккаунта (subject). */
  readonly sub: string;
  /** ID сессии. */
  readonly sessionId: string;
}
