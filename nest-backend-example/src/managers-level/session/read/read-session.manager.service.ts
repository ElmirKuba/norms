import { Injectable, Logger } from '@nestjs/common';
import { SessionAdapterService } from '../../../adapters/session/session.adapter.service';
import { ManagerResult } from '../../../interfaces/systems/manager-result.interface';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import { ISessionFull } from '../../../interfaces/full/session/session-full.interface';

/** Сервис модуля бизнес логики уровня manager чтения сессии */
@Injectable()
export class ReadSessionManagerService {
  /**
   * Логгер NestJS для вывода сообщений в консоль.
   * @private
   */
  private readonly logger = new Logger(ReadSessionManagerService.name);

  /**
   * @param {SessionAdapterService} sessionAdapterService - Адаптер репозитория сессий схемы СуБД
   */
  constructor(private sessionAdapterService: SessionAdapterService) {}

  /**
   * Чтение сессии до момента ее удаления
   * @param {string} refreshToken - Токен обновления пары токенов
   * @returns {Promise<ManagerResult<ISessionFull | null>>}
   * @public
   */
  public async readBeforeDelete(
    refreshToken: string,
  ): Promise<ManagerResult<ISessionFull | null>> {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    /** Результат нахождения сессии в таблице сессий в СуБД */
    const resultRead = await this.sessionAdapterService.readOneBySlug([
      {
        columnName: 'refreshToken',
        columnValue: refreshToken,
      },
    ]);

    if (resultRead.error && !resultRead.adaptData) {
      errorMessages.push(
        'Сессия для аккаунта не найдена, аккаунт не нуждается в выходе!',
      );

      this.logger.error(
        `ReadSessionManagerService -> readBeforeDelete : Сессия ${refreshToken} не найдена, аккаунт не нуждается в выходе!`,
      );

      return {
        error: true,
        errorCode: EnumerationErrorCodes.ERROR_CODE_NOT_EXISTS,
        successMessages,
        errorMessages,
        data: null,
      };
    }

    successMessages.push(
      'Сессия для аккаунта найдена! Выход из аккаунта может быть произведен!',
    );

    this.logger.log(
      `ReadSessionManagerService -> readBeforeDelete : Сессия ${refreshToken} найдена, аккаунт может произвести выход!`,
    );

    return {
      error: false,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      successMessages,
      errorMessages,
      data: resultRead.adaptData,
    };
  }

  /**
   * Чтение сессии до момента ее обновления
   * @param {string} refreshToken - Токен обновления пары токенов
   * @returns {Promise<ManagerResult<ISessionFull | null>>} - Данные обновления сессии
   * @public
   */
  public async readBeforeUpdate(
    refreshToken: string,
  ): Promise<ManagerResult<ISessionFull | null>> {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    /** Результат нахождения сессии в таблице сессий в СуБД */
    const resultRead = await this.sessionAdapterService.readOneBySlug([
      {
        columnName: 'refreshToken',
        columnValue: refreshToken,
      },
    ]);

    if (resultRead.error && !resultRead.adaptData) {
      errorMessages.push(
        'Сессия для аккаунта не найдена, аккаунт скорее всего не авторизован, сессия не нуждается в обновлении!',
      );

      this.logger.error(
        `ReadSessionManagerService -> readBeforeUpdate : Сессия ${refreshToken} не найдена, она не может нуждаться в обновлении. Причина: Скорее всего аккаунт не авторизован`,
      );

      return {
        error: true,
        data: null,
        errorMessages,
        successMessages,
        errorCode: EnumerationErrorCodes.ERROR_CODE_NOT_EXISTS,
      };
    }

    successMessages.push(
      'Сессия для аккаунта найдена! Сессия может быть обновлена!',
    );

    this.logger.log(
      `ReadSessionManagerService -> readBeforeUpdate : Сессия ${refreshToken} найдена, она может быть обновлена!`,
    );

    return {
      error: false,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      successMessages,
      errorMessages,
      data: resultRead.adaptData,
    };
  }

  /**
   * Чтение текущей сессии зная ее ID
   * @param {string} id - Идентификатор сессии которая будет прочитана
   * @returns {Promise<ManagerResult<ISessionFull | null>>} - Результат чтения сессии
   * @public
   */
  public async readById(
    id: string,
  ): Promise<ManagerResult<ISessionFull | null>> {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    /** Результат нахождения сессии в таблице сессий в СуБД */
    const resultRead = await this.sessionAdapterService.readOneBySlug([
      {
        columnName: 'id',
        columnValue: id,
      },
    ]);

    if (resultRead.error && !resultRead.adaptData) {
      errorMessages.push(`Сессия по идентификатору "${id}" не найдена!`);

      this.logger.error(
        `ReadSessionManagerService -> readById : Сессия по идентификатору "${id}" не найдена!. Причина: Скорее всего ни один аккаунт не авторизован по сессии с данным идентификатором`,
      );

      return {
        error: true,
        data: null,
        errorMessages,
        successMessages,
        errorCode: EnumerationErrorCodes.ERROR_CODE_NOT_EXISTS,
      };
    }

    successMessages.push(
      `Сессия для аккаунта найдена по идентификатору "${id}"!`,
    );

    this.logger.log(
      `ReadSessionManagerService -> readById : Сессия для аккаунта найдена по идентификатору "${id}"!`,
    );

    return {
      error: false,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      successMessages,
      errorMessages,
      data: resultRead.adaptData,
    };
  }

  /**
   * Чтение всех сессий аккаунта по его ID
   * @param {string} accountId - Идентификатор аккаунта по которому нужен список всех его сессий
   * @returns {} - Результат работы метода чтения всех сессий аккаунта по его идентификатора
   * @public
   */
  public async readListByAccountId(
    accountId: string,
  ): Promise<ManagerResult<ISessionFull[] | null>> {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    /** Результаты чтения сессий */
    const resultListRead =
      await this.sessionAdapterService.readListByAccountId(accountId);

    if (resultListRead.error && !resultListRead.adaptData) {
      errorMessages.push(
        `Для аккаунта с идентификатором "${accountId}" не найдены сессии`,
      );

      this.logger.error(
        `ReadSessionManagerService -> readListByAccountId : Для аккаунта с идентификатором "${accountId}" не найдены сессии`,
      );

      return {
        error: true,
        data: null,
        errorMessages,
        successMessages,
        errorCode: EnumerationErrorCodes.ERROR_CODE_NOT_EXISTS,
      };
    }

    successMessages.push(
      `Для аккаунта с идентификатором "${accountId}" были найдены сессии, количество: ${resultListRead.adaptData?.length}`,
    );

    this.logger.log(
      `ReadSessionManagerService -> readListByAccountId : Для аккаунта с идентификатором "${accountId}" были найдены сессии, количество: ${resultListRead.adaptData?.length}`,
    );

    return {
      error: false,
      errorMessages,
      successMessages,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      data: resultListRead.adaptData,
    };
  }
}
