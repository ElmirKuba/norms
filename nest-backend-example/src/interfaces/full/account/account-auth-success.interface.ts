import { IAccountWithoutPassword } from './account-without-password.interface';
import { IPairTokens } from '../../systems/pair-tokens.interface';

/** Данные отдаваемые на Frontend при успешной авторизации аккаунта */
export interface IAccountAuthSuccess {
  /** Данные аккаунта без пароля */
  autharizationAccount: IAccountWithoutPassword;
  /** Временный токен JWT для доступа к системам */
  accessToken: IPairTokens['accessToken'];
}
