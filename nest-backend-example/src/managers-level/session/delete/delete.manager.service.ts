import { Injectable, Logger } from '@nestjs/common';
import { SessionAdapterService } from '../../../adapters/session/session.adapter.service';
import {
  EndOfSessions,
  ManagerResult,
} from '../../../interfaces/systems/manager-result.interface';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import { ISessionFull } from '../../../interfaces/full/session/session-full.interface';

/** Сервис уровня manager бизнес логики удаления сессии */
@Injectable()
export class DeleteSessionManagerService {
  /**
   * Логгер NestJS для вывода сообщений в консоль.
   * @private
   */
  private readonly logger = new Logger(DeleteSessionManagerService.name);

  /**
   * @param {SessionAdapterService} sessionAdapterService - Адаптер репозитория сессий схемы СуБД
   */
  constructor(private sessionAdapterService: SessionAdapterService) {}

  /**
   * Метод удаления найденной сессии
   * @param {string} id - Идентификатор найденной сессии для удаления
   * @returns {Promise<ManagerResult<null>>} - Данные удаленной сессии
   * @public
   */
  public async delete(id: string): Promise<ManagerResult<null>> {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    const resultDeleted = await this.sessionAdapterService.delete(id);

    if (resultDeleted.error) {
      errorMessages.push(
        `Идентификатор сессии "${id}" не сможет быть удален из-за внутренней ошибки!`,
      );

      this.logger.error(
        `DeleteSessionManagerService -> delete : Идентификатор сессии "${id}" не сможет быть удален. Причина: внутренняя ошибка`,
      );

      return {
        error: true,
        data: null,
        errorMessages,
        successMessages,
        errorCode: EnumerationErrorCodes.ERROR_CODE_INTERNAL_ERROR,
      };
    }

    successMessages.push(
      `Сессия с идентификатором "${id}" была успешно удалена!`,
    );

    this.logger.log(
      `DeleteSessionManagerService -> delete : Сессия с идентификатором "${id}" была успешно удалена!`,
    );

    return {
      error: false,
      data: null,
      successMessages,
      errorMessages,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
    };
  }

  /**
   * Удаление всех сессий кроме текущей
   * @param {ISessionFull[]} sessionArray - Массив тел объектов всех сессий претендентов на завершение работы с аккаунтом
   * @param incomingRefreshTokenCurrentSession - JWT токен обновления для поиска в массиве сессий той сессии изк которой не надо выходить потому что она текущая
   * @returns {Promise<ManagerResult<EndOfSessions | null>>} - Результат работы метода менеджера выхода из всех сессий кроме текущей
   * @public
   */
  public async clearOthers(
    sessionArray: ISessionFull[],
    incomingRefreshTokenCurrentSession: string,
  ): Promise<ManagerResult<EndOfSessions | null>> {
    /** Массив сообщений для ошибок */
    const errorMessages: string[] = [];
    /** Массив сообщений для успеха */
    const successMessages: string[] = [];

    /** Массив сессий без текущей */
    const sessionsFilteredWithoutCurrent = sessionArray.filter(
      (sessionItemFiltered: ISessionFull): boolean => {
        if (
          sessionItemFiltered.refreshToken !==
          incomingRefreshTokenCurrentSession
        ) {
          return true;
        } else {
          return false;
        }
      },
    );

    if (!sessionsFilteredWithoutCurrent.length) {
      errorMessages.push(
        `Нет прочих сессий для завершения их работы с аккаунтом!`,
      );

      this.logger.error(
        `DeleteSessionManagerService -> clearOthers : Идентификатор сессии "${incomingRefreshTokenCurrentSession}" является единственной сессией для своего аккаунта. Причина: Не кто не авторизовывался в данный аккаунт из других мест/средств/клиентов/устройств.`,
      );

      return {
        error: true,
        data: null,
        errorMessages,
        successMessages,
        errorCode: EnumerationErrorCodes.ERROR_CODE_INTERNAL_ERROR,
      };
    }

    /** Массив сессий завершенных успешно */
    const sessionArraySuccess: ISessionFull[] = [];
    /** Массив сессий которые завершить не получилось */
    const sessionArrayError: ISessionFull[] = [];

    for (
      let index = 0;
      index < sessionsFilteredWithoutCurrent.length;
      index++
    ) {
      const resultDeleted = await this.sessionAdapterService.delete(
        sessionsFilteredWithoutCurrent[index].id,
      );

      if (resultDeleted.error) {
        errorMessages.push(
          `Идентификатор сессии "${sessionsFilteredWithoutCurrent[index].id}" не сможет быть удален из-за внутренней ошибки!`,
        );

        this.logger.error(
          `DeleteSessionManagerService -> clearOthers : Идентификатор сессии "${sessionsFilteredWithoutCurrent[index].id}" не сможет быть удален. Причина: внутренняя ошибка`,
        );

        sessionArrayError.push(sessionsFilteredWithoutCurrent[index]);
        continue;
      }

      successMessages.push(
        `Сессия с идентификатором "${sessionsFilteredWithoutCurrent[index].id}" была успешно удалена!`,
      );

      this.logger.log(
        `DeleteSessionManagerService -> delete : Сессия с идентификатором "${sessionsFilteredWithoutCurrent[index].id}" была успешно удалена!`,
      );

      sessionArraySuccess.push(sessionsFilteredWithoutCurrent[index]);
      continue;
    }

    if (sessionArrayError.length) {
      errorMessages.push(
        `Колличество сессий которые не удалось завершить: ${sessionArrayError.length}`,
      );

      this.logger.error(
        `DeleteSessionManagerService -> clearOthers : Колличество сессий которые не удалось завершить: ${sessionArrayError.length}`,
      );

      if (sessionArrayError.length === sessionsFilteredWithoutCurrent.length) {
        this.logger.error(
          `Все сессии в колличестве "${sessionArrayError.length}" завершить не удалось!`,
        );

        return {
          error: true,
          successMessages,
          errorMessages: [
            ...errorMessages,
            `Все сессии в колличестве "${sessionArrayError.length}" завершить не удалось!`,
          ],
          errorCode: EnumerationErrorCodes.ERROR_CODE_NOT_EXISTS,
          data: {
            sessionArrayError,
            sessionArraySuccess,
          },
        };
      }
    }

    if (sessionArraySuccess.length) {
      successMessages.push(
        `Колличество сессий которые удалось завершить: ${sessionArraySuccess.length}`,
      );

      this.logger.error(
        `DeleteSessionManagerService -> clearOthers : Колличество сессий которые удалось завершить: ${sessionArraySuccess.length}`,
      );
    }

    return {
      error: false,
      successMessages,
      errorMessages,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      data: {
        sessionArrayError,
        sessionArraySuccess,
      },
    };
  }
}
