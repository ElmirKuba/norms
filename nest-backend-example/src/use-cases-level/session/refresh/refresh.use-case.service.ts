import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ReadSessionManagerService } from '../../../managers-level/session/read/read-session.manager.service';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import { UseCaseResult } from '../../../interfaces/systems/use-case-result.interface';
import { ValidateTokensManagerService } from '../../../managers-level/tokens/validate-tokens/validate-tokens.manager.service';
import { DeleteSessionManagerService } from '../../../managers-level/session/delete/delete.manager.service';
import { AccountReadManagerService } from '../../../managers-level/account/read/account-read.manager.service';
import { AccountToOutputFrontend } from '../../../dtos/output/account/account-to-input-data.dto';
import { GenerateTokensManagerService } from '../../../managers-level/tokens/generate-tokens/generate-tokens.manager.service';
import { IResult } from 'ua-parser-js';
import { CreateOrUpdateSessionManagerService } from '../../../managers-level/session/create-or-update/create-or-update.manager.service';
import { AccountWithTokensAfterSuccessAuth } from '../../../interfaces/systems/account-with-tokens-after-success-auth.interface';
import { joinUaSection } from '../../../system/utils/join-ua-section.helper';

/** Сервис модуля бизнес логики уровня UseCase обновления сессии */
@Injectable()
export class SessionRefreshUseCaseService {
  /**
   * Конструктор сервиса системы
   * @param {ReadSessionManagerService} readSessionManagerService - Экземпляр сервиса модуля бизнес логики уровня manager чтения сессии
   * @param {ValidateTokensManagerService} validateTokensManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager связанных с валидацией токенов
   * @param {DeleteSessionManagerService} deleteSessionManagerService - Экземпляр сервиса уровня manager бизнес логики удаления сессии
   * @param {AccountReadManagerService} accountReadManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager чтения аккаунта
   * @param {GenerateTokensManagerService} generateTokensManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager связанных с генерацией токенов
   * @param {CreateOrUpdateSessionManagerService} createOrUpdateSessionManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager связанных с созданием и/или обновления сессии авторизованного аккаунта
   */
  constructor(
    private readSessionManagerService: ReadSessionManagerService,
    private validateTokensManagerService: ValidateTokensManagerService,
    private deleteSessionManagerService: DeleteSessionManagerService,
    private accountReadManagerService: AccountReadManagerService,
    private generateTokensManagerService: GenerateTokensManagerService,
    private createOrUpdateSessionManagerService: CreateOrUpdateSessionManagerService,
  ) {}

  /**
   * Метод обновления сессии
   * @param {string} refreshToken - Токен обновления пары токенов JWT
   * @param {string} userIp - IP адрес пользователя который обновляет сессию
   * @returns {Promise<UseCaseResult<AccountWithTokensAfterSuccessAuth | null>>} - Результат обновления пары токенов JWT
   * @public
   */
  public async refresh(
    refreshToken: string,
    userAgentData: IResult,
    userIp: string,
  ): Promise<UseCaseResult<AccountWithTokensAfterSuccessAuth | null>> {
    /** Результат чтения сессии до момента ее обновлена */
    const resultReadBeforeUpdate =
      await this.readSessionManagerService.readBeforeUpdate(refreshToken);

    if (resultReadBeforeUpdate.error) {
      return {
        ...resultReadBeforeUpdate,
        data: null,
      };
    }

    /** Результат валидации токена доступа */
    const resultValidateRefreshToken =
      this.validateTokensManagerService.validateAnyToken(
        resultReadBeforeUpdate.data?.refreshToken as string,
        'refreshToken',
      );

    if (resultValidateRefreshToken.error) {
      /** Результат удаления невалидной сессии */
      const resultAnInvaliedSessionDelete =
        await this.deleteSessionManagerService.delete(
          resultReadBeforeUpdate.data?.id as string,
        );

      if (resultAnInvaliedSessionDelete.error) {
        return {
          ...resultReadBeforeUpdate,
          data: null,
        };
      }

      if (
        resultValidateRefreshToken.errorMessages?.some((errMes) => {
          return errMes.includes('jwt expired');
        })
      ) {
        throw new UnauthorizedException(
          'Срок действия доступа истек, сессию обновить не получится, пройдите авторизацию заного!',
        );
      }

      throw new UnauthorizedException('Сессия истекла или была подделана');
    }

    const resultReadAccount = await this.accountReadManagerService.readWithId(
      resultValidateRefreshToken.data?.accountDto.id as string,
    );

    /** Данные аккаунта без поля пароля для Frontend */
    const accountToOutputFromFrontendDto = new AccountToOutputFrontend(
      resultReadAccount.data,
    );

    /** Новая пара токенов */
    const pairTokens = this.generateTokensManagerService.generatePairTokens({
      accountDto: accountToOutputFromFrontendDto,
      userAgentData,
      userIp,
    });

    const browserData = joinUaSection(userAgentData?.browser);
    const cpuArchitecture = joinUaSection(userAgentData?.cpu);
    const deviceData = joinUaSection(userAgentData?.device);
    const osData = joinUaSection(userAgentData?.os);

    /** Результат сохранения сесиии */
    const resultSavedToken =
      await this.createOrUpdateSessionManagerService.createOrUpdate({
        accountId: resultReadBeforeUpdate.data?.accountId as string,
        browserData,
        cpuArchitecture,
        deviceData,
        ip: userIp,
        osData,
        refreshToken: pairTokens.refreshToken,
        ua: userAgentData?.ua,
      });

    if (resultSavedToken.error) {
      return {
        ...resultSavedToken,
        data: null,
      };
    }

    return {
      error: false,
      successMessages: [
        ...resultReadBeforeUpdate.successMessages,
        ...resultValidateRefreshToken.successMessages,
        ...resultSavedToken.successMessages,
      ],
      errorMessages: [
        ...resultReadBeforeUpdate.errorMessages,
        ...resultValidateRefreshToken.errorMessages,
        ...resultSavedToken.errorMessages,
      ],
      data: {
        account: accountToOutputFromFrontendDto,
        tokens: pairTokens,
      },
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
    };
  }
}
