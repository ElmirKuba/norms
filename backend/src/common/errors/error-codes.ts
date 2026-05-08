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

/** Пользовательские сообщения для каждого кода ошибки. */
export const ErrorMessage: Record<ErrorCode, string> = {
  // Auth
  [ErrorCode.MISSING_TOKEN]: 'Authorization header отсутствует',
  [ErrorCode.INVALID_TOKEN]: 'Токен невалиден или истёк',

  // Account
  [ErrorCode.INVALID_CREDENTIALS]: 'UIN/логин или пароль не совпадают',
  [ErrorCode.DEVICE_LIMIT_REACHED]: 'Достигнут лимит устройств',
  [ErrorCode.ACCOUNT_NOT_FOUND]: 'Аккаунт не найден',
  [ErrorCode.AMBIGUOUS_QUERY]: 'Передайте либо id, либо uin, но не оба',
  [ErrorCode.LOGIN_RATE_LIMITED]: 'Слишком много неудачных попыток',

  // Invite
  [ErrorCode.INVITE_REQUIRED]: 'Код приглашения обязателен',
  [ErrorCode.INVITE_NOT_FOUND]: 'Код не найден или истёк',
  [ErrorCode.INVITE_EXPIRED]: 'Инвайт истёк',
  [ErrorCode.INVITE_ALREADY_USED]: 'Инвайт уже был использован',
  [ErrorCode.NO_INVITES_REMAINING]: 'Нет доступных инвайтов',
  [ErrorCode.NOT_YOUR_INVITE]: 'Нет доступа к этому инвайту',
  [ErrorCode.RATE_LIMITED]: 'Слишком много запросов',

  // Session
  [ErrorCode.REFRESH_REUSED]: 'Refresh-токен уже был использован. Сессия аннулирована.',
  [ErrorCode.SESSION_NOT_FOUND]: 'Сессия не найдена',
  [ErrorCode.NOT_YOUR_SESSION]: 'Нет доступа к этой сессии',
};

/** Форма объекта ошибки для передачи в NestJS-исключение. */
interface ErrorBody {
  /** Машинный код ошибки. */
  readonly code: ErrorCode;
  /** Человекочитаемое сообщение. */
  readonly message: string;
}

/**
 * Возвращает объект { code, message } для передачи в NestJS-исключение.
 * @param code - Код ошибки из ErrorCode.
 * @returns Объект с code и message.
 */
export function makeError(code: ErrorCode): ErrorBody {
  return { code, message: ErrorMessage[code] };
}
