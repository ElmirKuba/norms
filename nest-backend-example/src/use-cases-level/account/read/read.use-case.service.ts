import { Injectable } from '@nestjs/common';
import { AccountReadManagerService } from '../../../managers-level/account/read/account-read.manager.service';
import { UseCaseResult } from '../../../interfaces/systems/use-case-result.interface';
import { AccountToOutputFrontend } from '../../../dtos/output/account/account-to-input-data.dto';
import { IAccountWithoutPassword } from '../../../interfaces/full/account/account-without-password.interface';

/** Сервис модуля бизнес логики уровня UseCase чтения аккаунта */
@Injectable()
export class AccountReadUseCaseService {
  /**
   * Конструктор сервиса системы
   * @param {AccountReadManagerService} accountReadManagerService - Экземпляр сервиса уровня manager бизнес логики чтения аккаунта
   */
  constructor(private accountReadManagerService: AccountReadManagerService) {}

  public async read(
    accountId: string,
  ): Promise<UseCaseResult<IAccountWithoutPassword | null>> {
    const resultReadAccount =
      await this.accountReadManagerService.readWithId(accountId);

    if (resultReadAccount.error) {
      return {
        ...resultReadAccount,
        data: null,
      };
    }

    /** Данные аккаунта без поля пароля для Frontend */
    const accountToOutputFromFrontendDto = new AccountToOutputFrontend(
      resultReadAccount.data,
    );

    return {
      ...resultReadAccount,
      data: accountToOutputFromFrontendDto,
    };
  }
}
