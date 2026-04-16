import { ISessionBase } from '../../pure-and-base/session/session-base.interface';

/** Полный интефейс сессии */
export interface ISessionFull extends ISessionBase {
  /** Идентификатор сессии (uuid_v4 + unixtime with ms) */
  id: string;
}
