/** Чистый интефейс сессии */
export interface ISessionPure {
  /** JWT токен обновления пары токенов JWT */
  refreshToken: string;
  /** User-Agent joined */
  ua: string;
  /** IP */
  ip: string;
  /** Данные браузера и движка */
  browserData: string | null;
  /** Архитектура процессора */
  cpuArchitecture: string | null;
  /** Вендор, модель и тип девайся */
  deviceData: string | null;
  /** Данные ОС */
  osData: string | null;
}
