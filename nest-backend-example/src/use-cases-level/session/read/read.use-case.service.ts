import { Injectable, Logger } from '@nestjs/common';
import { AccountReadManagerService } from '../../../managers-level/account/read/account-read.manager.service';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import { UseCaseResult } from 'src/interfaces/systems/use-case-result.interface';
import { ReadSessionManagerService } from '../../../managers-level/session/read/read-session.manager.service';
import { ISessionFull } from '../../../interfaces/full/session/session-full.interface';

/** Сервис модуля бизнес логики уровня UseCase чтения сессий */
@Injectable()
export class SessionReadUseCaseService {
  /**
   * Логгер NestJS для вывода сообщений в консоль.
   * @private
   */
  private readonly logger = new Logger(SessionReadUseCaseService.name);

  /**
   * Конструктор сервиса системы
   * @param {AccountReadManagerService} accountReadManagerService - Экземпляр сервиса модуля бизнес логики уровня Manager чтения аккаунта
   * @param {ReadSessionManagerService} readSessionManagerService - Экземпляр сервиса модуля бизнес логики уровня manager чтения сессии
   */
  constructor(
    private accountReadManagerService: AccountReadManagerService,
    private readSessionManagerService: ReadSessionManagerService,
  ) {}

  /**
   * Метод чтения всех сессий аккаунта по его ID
   * @param {string} accountId - Идентификатор аккаунта по которому нужен список всех его сессий
   * @returns {Promise<UseCaseResult<null>>} - Результат работы метода чтения всех сессий по идентификатору аккаунта
   * @public
   */
  public async readListByAccountId(
    accountId: string,
  ): Promise<UseCaseResult<ISessionFull[] | null>> {
    const resultReadAccount =
      await this.accountReadManagerService.readWithId(accountId);

    if (
      resultReadAccount.error &&
      resultReadAccount.errorCode ===
        EnumerationErrorCodes.ERROR_CODE_NOT_EXISTS
    ) {
      this.logger.error(
        `SessionReadUseCaseService -> readListByAccountId : Аккаунт с идентификатором "${accountId}" не существует, сессии получить не получится. Причина: запись не найдена в таблице аккаунтов в БД`,
      );

      return {
        error: true,
        data: null,
        errorCode: EnumerationErrorCodes.ERROR_CODE_NOT_EXISTS,
        errorMessages: [
          `Аккаунт с идентификатором "${accountId}" не найден, сессии не могут быть получены`,
        ],
        successMessages: [],
      };
    }

    /** Результаты чтения сессий */
    const resultListRead =
      await this.readSessionManagerService.readListByAccountId(accountId);

    if (resultListRead.error) {
      return {
        ...resultListRead,
        data: null,
      };
    }

    return {
      error: false,
      successMessages: [...resultListRead.successMessages],
      errorMessages: [...resultListRead.errorMessages],
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      data: resultListRead.data,
    };
  }
}
