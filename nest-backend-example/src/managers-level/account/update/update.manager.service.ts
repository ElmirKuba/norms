import { Injectable, Logger } from '@nestjs/common';
import { IAccountUpdate } from '../../../interfaces/with-child/account/account-update.interface';
import { IAccountFull } from '../../../interfaces/full/account/account-full.interface';
import { IAccountPure } from '../../../interfaces/pure-and-base/account/account-pure.interface';
import * as bcrypt from 'bcrypt';
import { omit } from 'lodash';
import { AccountAdapterService } from '../../../adapters/account/account.adapter.service';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import { ManagerResult } from '../../../interfaces/systems/manager-result.interface';

/** Сервис модуля бизнес логики уровня Manager обновления данных аккаунта */
@Injectable()
export class AccountUpdateManagerService {
  /**
   * Логгер NestJS для вывода сообщений в консоль.
   * @private
   */
  private readonly logger = new Logger(AccountUpdateManagerService.name);

  /**
   * Конструктор сервиса системы
   * @param {AccountAdapterService} accountAdapterService - Экземпляр сервиса-адаптера создания аккаунта
   **/
  constructor(private accountAdapterService: AccountAdapterService) {}

  /**
   * Метод обновления данных аккаунта если он найден и существует
   * @param {IAccountUpdate} accountUpdateData - Данные аккаунта полученные от пользователя API
   * @param {IAccountFull} accountFull - Данные аккаунта из таблицы аккаунтов СуБД
   * @returns {Promise<ManagerResult<null>>} - Результат работы метода менеджера обновления данных аккаунта
   * @public
   */
  public async updateAccountDataExistingAccount(
    accountUpdateData: IAccountUpdate,
    accountFull: IAccountFull,
  ): Promise<ManagerResult<null>> {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    const accountDataForUpdate: Partial<IAccountPure> = omit(
      accountUpdateData.accountData,
      'password',
    );

    if (accountUpdateData.accountData.password && accountFull.password) {
      successMessages.push(
        `У аккаунта с идентификатором "${accountUpdateData.id}" будет изменен пароль!`,
      );

      this.logger.log(
        `AccountUpdateManagerService -> updateAccountDataExistingAccount : У аккаунта с идентификатором "${accountUpdateData.id}" будет изменен пароль!`,
      );

      /** Захешированный пароль */
      const tempBcryptHashPassword = bcrypt.hashSync(
        accountUpdateData.accountData.password,
        8,
      );

      accountDataForUpdate.password = tempBcryptHashPassword;
    }

    /** Результаты обновления аккаунта */
    const resultUpdate = await this.accountAdapterService.update({
      id: accountUpdateData.id,
      accountData: accountDataForUpdate,
    });

    if (resultUpdate.error) {
      errorMessages.push(
        `Ошибка обновления данных аккаунта с идентификатором "${accountUpdateData.id}": внутренняя ошибка`,
      );

      this.logger.error(
        `AccountUpdateManagerService -> updateAccountDataExistingAccount : Аккаунт идентификатором ${accountUpdateData.id} не сможет быть обновлен. Причина: внутренняя ошибка`,
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
      `Аккаунт с идентификатором "${accountUpdateData.id}" успешно обновлен!`,
    );

    this.logger.log(
      `AccountUpdateManagerService -> updateAccountDataExistingAccount : Аккаунт с идентификатором "${accountUpdateData.id}" успешно обновлен.`,
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
