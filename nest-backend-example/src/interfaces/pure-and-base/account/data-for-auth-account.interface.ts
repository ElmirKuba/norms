import { IResult } from 'ua-parser-js';
import { IAccountPure } from './account-pure.interface';

/** Данные для бизнес логики уровня Use-Case сервиса авторизации аккаунта */
export interface DataForAuthAccount {
  /** Данные аккаунта для авторизации */
  dataForAuthCorrectAccount: IAccountPure;
  /** Данные парсинга user-agent */
  userAgentData?: IResult;
  /** IP-адрес пользователя */
  userIp?: string;
}
