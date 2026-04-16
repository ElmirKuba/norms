import { ISessionPure } from './session-pure.interface';

/** Базовый интефейс сессии */
export interface ISessionBase extends ISessionPure {
  /** Идентификатор на аккаунт (uuid_v4 + unixtime with ms) */
  accountId: string;
}
