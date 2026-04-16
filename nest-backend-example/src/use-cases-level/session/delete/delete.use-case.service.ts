import { Injectable, Logger } from '@nestjs/common';
import { ReadSessionManagerService } from '../../../managers-level/session/read/read-session.manager.service';
import { UseCaseResult } from '../../../interfaces/systems/use-case-result.interface';
import { ISessionFull } from '../../../interfaces/full/session/session-full.interface';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import { DeleteSessionManagerService } from '../../../managers-level/session/delete/delete.manager.service';
import { EndOfSessions } from '../../../interfaces/systems/manager-result.interface';

/** Сервис модуля бизнес логики уровня UseCase удаления сессий */
@Injectable()
export class SessionDeleteUseCaseService {
  /**
   * Логгер NestJS для вывода сообщений в консоль.
   * @private
   */
  private readonly logger = new Logger(SessionDeleteUseCaseService.name);

  /**
   * Конструктор сервиса бизнес логики уровня Use-Case
   * @param {ReadSessionManagerService} readSessionManagerService - Экземпляр сервиса модуля бизнес логики уровня manager чтения сессии
   * @param {DeleteSessionManagerService} deleteSessionManagerService - Сервис уровня manager бизнес логики удаления сессии
   */
  constructor(
    private readSessionManagerService: ReadSessionManagerService,
    private deleteSessionManagerService: DeleteSessionManagerService,
  ) {}

  /**
   * Метод удаления своей сесии по его идентификатору
   * @param {string} sessionIdForDeleted - Идентификатор сессии для удаления из Query-param
   * @param {string} accountId - Идентификатор аккаунта пользователя текущей сессии
   * @param {string} incomingRefreshTokenCurrentSession - JWT токен обновления пары токенов текущей сессии
   * @returns {Promise<UseCaseResult<ISessionFull | null>>} - Результат удаления своей сессии зная ее ID + данные самой удаленной сессии в случае успеха
   * @public
   */
  public async deleteById(
    sessionIdForDeleted: string,
    accountId: string,
    incomingRefreshTokenCurrentSession: string,
  ): Promise<UseCaseResult<ISessionFull | null>> {
    /** Результаты чтения сессии по ее идентификатору */
    const resultRead =
      await this.readSessionManagerService.readById(sessionIdForDeleted);

    if (resultRead.error) {
      return {
        ...resultRead,
        data: null,
      };
    }

    if (accountId !== resultRead.data?.accountId) {
      this.logger.error(
        `SessionDeleteUseCaseService -> deleteById : Попытка удалить сессию с идентификатором "${sessionIdForDeleted}" была остановлена! Причина: Сессия не принадлежит аккаунту с идентификатором "${accountId}"`,
      );

      return {
        error: true,
        data: null,
        successMessages: [],
        errorMessages: [
          `Произошла ошибка, сессия с идентификатором "${sessionIdForDeleted}" не принадлежит вашему аккаунту с идентификатором "${accountId}"`,
        ],
        errorCode: EnumerationErrorCodes.ERROR_CODE_INTERNAL_ERROR,
      };
    }

    if (incomingRefreshTokenCurrentSession === resultRead.data?.refreshToken) {
      this.logger.error(
        `SessionDeleteUseCaseService -> deleteById : Попытка удалить сессию с идентификатором "${sessionIdForDeleted}" для аккаунта с идентификатором "${accountId} была остановлена! Причина: Потому что она является вашей текущей сессией"`,
      );

      return {
        error: true,
        data: null,
        successMessages: [],
        errorMessages: [
          `Произошла ошибка, сессия с идентификатором "${sessionIdForDeleted}" для аккаунта с идентификатором "${accountId}" не может быть удалена, потому что она является вашей текущей сессией. Текущую сессию можно завершить только выйдя из аккаунта!`,
        ],
        errorCode: EnumerationErrorCodes.ERROR_CODE_INTERNAL_ERROR,
      };
    }

    /** Безопасный идентификатор сессии для удаления */
    const secureSessionIdToDelete = resultRead.data.id;

    /** Результат удаления сессии зная ее идентификатор */
    const resultDeletedSession = await this.deleteSessionManagerService.delete(
      secureSessionIdToDelete,
    );

    if (resultDeletedSession.error) {
      return {
        ...resultDeletedSession,
        data: null,
      };
    }

    return {
      error: false,
      successMessages: [
        ...resultRead.successMessages,
        ...resultDeletedSession.successMessages,
      ],
      errorMessages: [
        ...resultRead.errorMessages,
        ...resultDeletedSession.errorMessages,
      ],
      data: resultRead.data,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
    };
  }

  /**
   * Удаление всех сессий кроме текущей
   * @param {string} accountId - Идентификатор аккаунта пользователя текущей сессии
   * @param {string} incomingRefreshTokenCurrentSession - JWT токен обновления пары токенов текущей сессии
   * @returns {Promise<UseCaseResult<EndOfSessions | null>>} - Результат удаления своей сессии зная ее ID + данные самой удаленной сессии в случае успеха
   * @public
   */
  public async clearOthers(
    accountId: string,
    incomingRefreshTokenCurrentSession: string,
  ): Promise<UseCaseResult<EndOfSessions | null>> {
    /** Результаты чтения сессий зная идентификатор аккаунта */
    const resultListRead =
      await this.readSessionManagerService.readListByAccountId(accountId);

    if (resultListRead.error) {
      return {
        ...resultListRead,
        data: null,
      };
    }

    /** Результат удаления всех сессий кроме текущей */
    const resultDeletedSession =
      await this.deleteSessionManagerService.clearOthers(
        resultListRead.data as ISessionFull[],
        incomingRefreshTokenCurrentSession,
      );

    if (resultDeletedSession.error) {
      return resultDeletedSession;
    }

    return resultDeletedSession;
  }
}
