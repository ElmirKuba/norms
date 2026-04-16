import { IAccountPure } from '../../pure-and-base/account/account-pure.interface';

/** Полный интерфейс аккаунта */
export interface IAccountFull extends IAccountPure {
  /** Идентификатор аккаунта (uuid_v4 + unixtime with ms) */
  id: string;
}
