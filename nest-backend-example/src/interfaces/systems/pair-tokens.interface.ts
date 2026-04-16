/** Интерфейс пары JWT токенов */
export interface IPairTokens {
  /** Токен обновления пары JWT токенов */
  refreshToken: string;
  /** Временный токен JWT для доступа к системам */
  accessToken: string;
}
