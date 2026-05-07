/**
 * Единый реестр кодов ошибок API.
 * Используется во всех use-cases при выбросе NestJS-исключений.
 */
export enum ErrorCode {
  // Auth
  MISSING_TOKEN = 'missing_token',
  INVALID_TOKEN = 'invalid_token',

  // Account
  INVALID_CREDENTIALS = 'invalid_credentials',
  DEVICE_LIMIT_REACHED = 'device_limit_reached',
  ACCOUNT_NOT_FOUND = 'account_not_found',
  AMBIGUOUS_QUERY = 'ambiguous_query',
  LOGIN_RATE_LIMITED = 'login_rate_limited',

  // Invite
  INVITE_REQUIRED = 'invite_required',
  INVITE_NOT_FOUND = 'invite_not_found',
  INVITE_EXPIRED = 'invite_expired',
  INVITE_ALREADY_USED = 'invite_already_used',
  NO_INVITES_REMAINING = 'no_invites_remaining',
  NOT_YOUR_INVITE = 'not_your_invite',
  RATE_LIMITED = 'rate_limited',

  // Session
  REFRESH_REUSED = 'refresh_reused',
  SESSION_NOT_FOUND = 'session_not_found',
  NOT_YOUR_SESSION = 'not_your_session',
}
