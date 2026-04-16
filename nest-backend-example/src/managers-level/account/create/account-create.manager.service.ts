import { Injectable, Logger } from '@nestjs/common';
import { IAccountPure } from '../../../interfaces/pure-and-base/account/account-pure.interface';
import { AccountAdapterService } from 'src/adapters/account/account.adapter.service';
import * as bcrypt from 'bcrypt';
import { AdapterResultRepo } from '../../../interfaces/adapters/result-query.adapter.interface';
import { ManagerResult } from '../../../interfaces/systems/manager-result.interface';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';

/** Экземпляр сервиса модуля бизнес логики уровня Manager создания аккаунта */
@Injectable()
export class AccountCreateManagerService {
  /**
   * Логгер NestJS для вывода сообщений в консоль.
   * @private
   */
  private readonly logger = new Logger(AccountCreateManagerService.name);

  /**
   * Конструктор сервиса системы
   * @param {AccountAdapterService} accountAdapterService - Экземпляр сервиса-адаптера создания аккаунта
   **/
  constructor(private accountAdapterService: AccountAdapterService) {}

  /**
   * Создать аккаунт который еще не существует
   * @param {IAccountPure} dataForNewAccount - Данные для создания аккаунта
   * @returns {Promise<ManagerResult<null>>} - Результат чтения аккаунта до момента его создания
   * @public
   * */
  async createNonExistingAccount(
    dataForNewAccount: IAccountPure,
  ): Promise<ManagerResult<null>> {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    /** Захешированный пароль */
    const tempBcryptHashPassword = bcrypt.hashSync(dataForNewAccount.password, 8);

    /** Результаты создания аккаунта */
    const resultCreate: AdapterResultRepo<null> =
      await this.accountAdapterService.create({
        ...dataForNewAccount,
        password: tempBcryptHashPassword,
      });

    if (resultCreate.error) {
      errorMessages.push(
        `Ошибка создания аккаунта для логина "${dataForNewAccount.login}": внутренняя ошибка`,
      );

      this.logger.error(
        `AccountCreateManagerService -> createNonExistingAccount : Аккаунт с логином ${dataForNewAccount.login} не сможет быть создан. Причина: внутренняя ошибка`,
      );

      return {
        error: true,
        errorCode: EnumerationErrorCodes.ERROR_CODE_INTERNAL_ERROR,
        successMessages,
        errorMessages,
        data: null,
      };
    }

    successMessages.push(
      `Аккаунт с логином "${dataForNewAccount.login}" успешно создан!`,
    );

    this.logger.log(
      `AccountCreateManagerService -> createNonExistingAccount : Аккаунт с логином ${dataForNewAccount.login} был создан.`,
    );

    return {
      error: false,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      successMessages,
      errorMessages,
      data: null,
    };
  }
}
