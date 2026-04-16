import { Injectable, Logger } from '@nestjs/common';
import { ISessionBase } from '../../../interfaces/pure-and-base/session/session-base.interface';
import { SessionAdapterService } from '../../../adapters/session/session.adapter.service';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import { ManagerResult } from '../../../interfaces/systems/manager-result.interface';
import { ISessionFull } from '../../../interfaces/full/session/session-full.interface';

/** Сервис модуля бизнес логики уровня Manager связанных с созданием и/или обновления сессии авторизованного аккаунта */
@Injectable()
export class CreateOrUpdateSessionManagerService {
  /**
   * Логгер NestJS для вывода сообщений в консоль.
   * @private
   */
  private readonly logger = new Logger(
    CreateOrUpdateSessionManagerService.name,
  );

  /**
   * Конструктор сервиса системы
   * @param {SessionAdapterService} sessionAdapterService - Экземпляр сервиса модуля адаптера репозитория для сессий
   **/
  constructor(private sessionAdapterService: SessionAdapterService) {}

  public async createOrUpdate(
    dataSessionForCreateOrUpdate: ISessionBase,
  ): Promise<ManagerResult<ISessionFull | null>> {
    const errorMessages: string[] = [];
    const successMessages: string[] = [];

    const resultUpsert = await this.sessionAdapterService.upsert(
      dataSessionForCreateOrUpdate,
    );

    if (resultUpsert.error) {
      errorMessages.push(
        `Сессию для UA "${dataSessionForCreateOrUpdate.ua}" с IP-адресом "${dataSessionForCreateOrUpdate.ip}" сохранить не получилось. Возможно это внутренняя ошибка, попробуйте позже.`,
      );

      this.logger.error(
        `CreateOrUpdateSessionManagerService -> createOrUpdate : Сессию для UA "${dataSessionForCreateOrUpdate.ua}" с IP-адресом "${dataSessionForCreateOrUpdate.ip}" сохранить не получилось. Причина: внутренняя ошибка`,
      );

      return {
        error: true,
        data: null,
        errorCode: EnumerationErrorCodes.ERROR_CODE_INTERNAL_ERROR,
        errorMessages,
        successMessages,
      };
    }

    successMessages.push(
      `Сессия для UA "${dataSessionForCreateOrUpdate.ua}" с IP-адресом "${dataSessionForCreateOrUpdate.ip}" успешно сохранена.`,
    );

    this.logger.log(
      `CreateOrUpdateSessionManagerService -> createOrUpdate : Сессия для UA "${dataSessionForCreateOrUpdate.ua}" с IP-адресом "${dataSessionForCreateOrUpdate.ip}" успешно сохранена.`,
    );

    return {
      error: false,
      data: null,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
      errorMessages,
      successMessages,
    };
  }
}
