import { Injectable } from '@nestjs/common';
import { IAccountPure } from '../../../interfaces/pure-and-base/account/account-pure.interface';
import { UseCaseResult } from '../../../interfaces/systems/use-case-result.interface';
import { AccountReadManagerService } from '../../../managers-level/account/read/account-read.manager.service';
import { AccountCreateManagerService } from '../../../managers-level/account/create/account-create.manager.service';

/** Сервис модуля бизнес логики уровня UseCase создания аккаунта */
@Injectable()
export class AccountCreateUseCaseService {
  /**
   * Конструктор сервиса системы
   * @param {AccountReadManagerService} accountReadManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager чтения аккаунта
   * @param {AccountCreateManagerService} accountCreateManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager создания аккаунта
   **/
  constructor(
    private accountReadManagerService: AccountReadManagerService,
    private accountCreateManagerService: AccountCreateManagerService,
  ) {}

  /**
   * Метод создания аккаунта
   * @param {IAccountPure} dataForNewAccount - Данные для создания аккаунта
   * @returns {Promise<void>} - Результат регистрации аккаунта
   * @public
   * */
  public async create(
    dataForNewAccount: IAccountPure,
  ): Promise<UseCaseResult<null>> {
    /** Результат чтения аккаунта до момента его создания */
    const resultReadBeforeCreate =
      await this.accountReadManagerService.readBeforeCreate(dataForNewAccount);

    if (resultReadBeforeCreate.error) {
      return {
        ...resultReadBeforeCreate,
        data: null,
      };
    }

    /** Результат чтения аккаунта до момента его создания */
    const resultCreatedNonExistingAccount =
      await this.accountCreateManagerService.createNonExistingAccount(
        dataForNewAccount,
      );

    if (resultCreatedNonExistingAccount.error) {
      return {
        ...resultCreatedNonExistingAccount,
        data: null,
      };
    }

    return {
      ...resultCreatedNonExistingAccount,
      data: null,
    };
  }
}
