import { IAccountPure } from '../../pure-and-base/account/account-pure.interface';

/** Интефейс аккаунта для обновления */
export interface IAccountUpdate {
  /** Идентификатор аккаунта (uuid_v4 + unixtime with ms) для обновления */
  id: string;
  /** Данные которые будут обновлены в аккаунте */
  accountData: Partial<IAccountPure>;
}
