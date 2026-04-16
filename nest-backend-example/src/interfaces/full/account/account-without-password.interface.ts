import { IAccountFull } from './account-full.interface';

/** Данные аккаунта без пароля */
export type IAccountWithoutPassword = Omit<IAccountFull, 'password'>;
