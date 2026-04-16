import { Injectable } from '@nestjs/common';
import { UseCaseResult } from '../../../interfaces/systems/use-case-result.interface';
import { EnumerationErrorCodes } from 'src/interfaces/systems/error-codes.interface';
import { DataForAuthAccount } from '../../../interfaces/pure-and-base/account/data-for-auth-account.interface';
import { AccountWithTokensAfterSuccessAuth } from '../../../interfaces/systems/account-with-tokens-after-success-auth.interface';
import { AccountReadManagerService } from '../../../managers-level/account/read/account-read.manager.service';
import { AccountAuthManagerService } from '../../../managers-level/account/auth/account-auth.manager.service';
import { IAccountFull } from '../../../interfaces/full/account/account-full.interface';
import { AccountToOutputFrontend } from '../../../dtos/output/account/account-to-input-data.dto';
import { GenerateTokensManagerService } from '../../../managers-level/tokens/generate-tokens/generate-tokens.manager.service';
import { IBrowser, ICPU } from 'ua-parser-js';
import { CreateOrUpdateSessionManagerService } from '../../../managers-level/session/create-or-update/create-or-update.manager.service';
import { joinUaSection } from '../../../system/utils/join-ua-section.helper';

/** Сервис модуля бизнес логики уровня UseCase авторизации аккаунта */
@Injectable()
export class AccountAuthUseCaseService {
  /**
   * Конструктор сервиса системы
   * @param {AccountReadManagerService} accountReadManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager чтения аккаунта
   * @param {AccountAuthManagerService} accountAuthManagerService - Экземпляр cервиса модуля бизнес логики уровня Manager авторизации аккаунта
   * @param {GenerateTokensManagerService} generateTokensManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager связанных с генерацией токенов
   * @param {CreateOrUpdateSessionManagerService} createOrUpdateSessionManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager связанных с созданием и/или обновления сессии авторизованного аккаунта
   **/
  constructor(
    private accountReadManagerService: AccountReadManagerService,
    private accountAuthManagerService: AccountAuthManagerService,
    private generateTokensManagerService: GenerateTokensManagerService,
    private createOrUpdateSessionManagerService: CreateOrUpdateSessionManagerService,
  ) {}

  public async auth(
    dataForAuthAccount: DataForAuthAccount,
  ): Promise<UseCaseResult<AccountWithTokensAfterSuccessAuth | null>> {
    /** Результат чтения аккаунта до момента его создания */
    const resultReadBeforeCreate =
      await this.accountReadManagerService.readBeforeAuth(
        dataForAuthAccount.dataForAuthCorrectAccount,
      );

    if (resultReadBeforeCreate.error) {
      return {
        ...resultReadBeforeCreate,
        data: null,
      };
    }

    /** Результат чтения аккаунта до момента его создания */
    const resultAuthExistingAccount =
      this.accountAuthManagerService.authExistingAccount(
        dataForAuthAccount.dataForAuthCorrectAccount,
        resultReadBeforeCreate.data as IAccountFull,
      );

    if (resultAuthExistingAccount.error) {
      return {
        ...resultAuthExistingAccount,
        data: null,
      };
    }

    /** Данные аккаунта без поля пароля для Frontend */
    const accountToOutputFromFrontendDto = new AccountToOutputFrontend(
      resultReadBeforeCreate.data,
    );

    /** Новая пара токенов */
    const pairTokens = this.generateTokensManagerService.generatePairTokens({
      accountDto: accountToOutputFromFrontendDto,
      userAgentData: dataForAuthAccount.userAgentData,
      userIp: dataForAuthAccount.userIp,
    });

    const browserData = joinUaSection(
      dataForAuthAccount?.userAgentData?.browser as IBrowser | undefined,
    );
    const cpuArchitecture = joinUaSection(
      dataForAuthAccount?.userAgentData?.cpu as ICPU | undefined,
    );
    const deviceData = joinUaSection(
      dataForAuthAccount?.userAgentData?.device as ICPU | undefined,
    );
    const osData = joinUaSection(
      dataForAuthAccount?.userAgentData?.os as ICPU | undefined,
    );

    /** Результат сохранения сесиии */
    const resultSavedToken =
      await this.createOrUpdateSessionManagerService.createOrUpdate({
        accountId: resultReadBeforeCreate.data?.id as string,
        browserData,
        cpuArchitecture,
        deviceData,
        ip: dataForAuthAccount.userIp as string,
        osData,
        refreshToken: pairTokens.refreshToken,
        ua: dataForAuthAccount.userAgentData?.ua as string,
      });

    if (resultSavedToken.error) {
      return {
        ...resultSavedToken,
        data: null,
      };
    }

    return {
      error: false,
      data: {
        account: accountToOutputFromFrontendDto,
        tokens: pairTokens,
      },
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      errorMessages: [
        ...resultReadBeforeCreate.errorMessages,
        ...resultAuthExistingAccount.errorMessages,
        ...resultSavedToken.errorMessages,
      ],
      successMessages: [
        ...resultReadBeforeCreate.successMessages,
        ...resultAuthExistingAccount.successMessages,
        ...resultSavedToken.successMessages,
      ],
    };
  }
}
