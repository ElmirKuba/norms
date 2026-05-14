/**
 * Единый реестр кодов ошибок API.
 * Используется во всех use-cases при выбросе NestJS-исключений.
 */
export enum ErrorCode {
  // Auth
  /** JWT-токен отсутствует в заголовке Authorization. */
  MISSING_TOKEN = 'missing_token',
  /** JWT-токен невалиден или истёк. */
  INVALID_TOKEN = 'invalid_token',

  // Account
  /** UIN/логин или пароль не совпадают. */
  INVALID_CREDENTIALS = 'invalid_credentials',
  /** Достигнут лимит активных устройств аккаунта. */
  DEVICE_LIMIT_REACHED = 'device_limit_reached',
  /** Аккаунт с данным ID не найден. */
  ACCOUNT_NOT_FOUND = 'account_not_found',
  /** Переданы одновременно id и uin — допустим только один параметр. */
  AMBIGUOUS_QUERY = 'ambiguous_query',
  /** Превышен лимит неудачных попыток входа — аккаунт временно заблокирован. */
  LOGIN_RATE_LIMITED = 'login_rate_limited',
  /** Запрос не содержит ни одного поля для обновления. */
  NOTHING_TO_UPDATE = 'nothing_to_update',
  /** Для смены пароля обязателен current_password. */
  CURRENT_PASSWORD_REQUIRED = 'current_password_required',

  // Invite
  /** Код приглашения обязателен при закрытой регистрации. */
  INVITE_REQUIRED = 'invite_required',
  /** Инвайт-код не найден или уже истёк. */
  INVITE_NOT_FOUND = 'invite_not_found',
  /** Срок действия инвайт-кода истёк. */
  INVITE_EXPIRED = 'invite_expired',
  /** Инвайт-код уже был использован (race condition). */
  INVITE_ALREADY_USED = 'invite_already_used',
  /** У аккаунта закончились доступные инвайты. */
  NO_INVITES_REMAINING = 'no_invites_remaining',
  /** Попытка отозвать чужой инвайт. */
  NOT_YOUR_INVITE = 'not_your_invite',
  /** Превышен лимит запросов (rate limiting по IP). */
  RATE_LIMITED = 'rate_limited',

  // Session
  /** Refresh-токен уже был использован — возможна компрометация сессии. */
  REFRESH_REUSED = 'refresh_reused',
  /** Сессия с данным ID не найдена. */
  SESSION_NOT_FOUND = 'session_not_found',
  /** Попытка управлять сессией другого аккаунта. */
  NOT_YOUR_SESSION = 'not_your_session',

  // Chat
  /** Чат с данным ID не найден. */
  CHAT_NOT_FOUND = 'chat_not_found',
  /** Чат с таким именем между этой парой устройств уже существует. */
  CHAT_NAME_TAKEN = 'chat_name_taken',

  // Recovery
  /** Вопрос безопасности не найден. */
  RECOVERY_QUESTION_NOT_FOUND = 'recovery_question_not_found',
  /** Попытка изменить чужой вопрос безопасности. */
  NOT_YOUR_RECOVERY_QUESTION = 'not_your_recovery_question',
  /** У аккаунта нет настроенных вопросов восстановления. */
  RECOVERY_NOT_CONFIGURED = 'recovery_not_configured',
  /** Ответ на секретный вопрос неверен. */
  WRONG_ANSWER = 'wrong_answer',
  /** Превышен лимит неудачных попыток восстановления — аккаунт заблокирован. */
  RECOVERY_RATE_LIMITED = 'recovery_rate_limited',
  /** Токен сброса пароля недействителен. */
  RESET_TOKEN_INVALID = 'reset_token_invalid',
  /** Токен сброса пароля истёк. */
  RESET_TOKEN_EXPIRED = 'reset_token_expired',
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
  [ErrorCode.NOTHING_TO_UPDATE]: 'Нет полей для обновления',
  [ErrorCode.CURRENT_PASSWORD_REQUIRED]: 'Для смены пароля укажите current_password',

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

  // Chat
  [ErrorCode.CHAT_NOT_FOUND]: 'Чат не найден',
  [ErrorCode.CHAT_NAME_TAKEN]: 'Чат с таким именем уже существует',

  // Recovery
  [ErrorCode.RECOVERY_QUESTION_NOT_FOUND]: 'Вопрос безопасности не найден',
  [ErrorCode.NOT_YOUR_RECOVERY_QUESTION]: 'Нет доступа к этому вопросу',
  [ErrorCode.RECOVERY_NOT_CONFIGURED]: 'Восстановление не настроено для этого аккаунта',
  [ErrorCode.WRONG_ANSWER]: 'Неверный ответ на секретный вопрос',
  [ErrorCode.RECOVERY_RATE_LIMITED]: 'Слишком много неудачных попыток восстановления',
  [ErrorCode.RESET_TOKEN_INVALID]: 'Токен сброса пароля недействителен',
  [ErrorCode.RESET_TOKEN_EXPIRED]: 'Токен сброса пароля истёк',
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
