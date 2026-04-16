import { ISessionBase } from '../../pure-and-base/session/session-base.interface';

/** Интефейс сессии для обновления */
export interface ISessionUpdate {
  /** Идентификатор сессии (uuid_v4 + unixtime with ms) для обновления */
  id: string;
  /** Данные которые будут обновлены в сессии */
  sessionData: ISessionBase;
}
