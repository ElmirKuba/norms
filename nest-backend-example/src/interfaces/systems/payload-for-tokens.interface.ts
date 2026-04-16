import { IResult } from 'ua-parser-js';
import { AccountToOutputFrontend } from '../../dtos/output/account/account-to-input-data.dto';

/** Интерфейс полезной нагрузки для генерации JWT токена */
export interface IPayloadForTokens {
  /** Экземпляр DTO аккаунта */
  accountDto: AccountToOutputFrontend;
  /** Роли на будущее */ // TODO: ElmirKuba 2025-08-04: Если будут нужны роли то это тут
  rolesDto?: { [key: string]: unknown }[];
  /** Данные парсинга user-agent */
  userAgentData?: IResult;
  /** IP-адрес пользователя */
  userIp?: string;
  /** Тип JWT токена */
  tokenType?: 'refreshToken' | 'accessToken';
}
