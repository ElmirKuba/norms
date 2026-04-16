import { Injectable } from '@nestjs/common';
import { ReadQueryAdapter } from '../../interfaces/adapters/read-query.adapter.interface';
import { ISessionFull } from '../../interfaces/full/session/session-full.interface';
import { SessionDrizzleRepositoryService } from '../../drizzle-repositories/session/session.drizzle-repository.service';
import { AdapterResultRepo } from '../../interfaces/adapters/result-query.adapter.interface';
import { ISessionBase } from '../../interfaces/pure-and-base/session/session-base.interface';
import { ISessionUpdate } from '../../interfaces/with-child/session/session-update.interface';

/** Сервис модуля адаптера репозитория для сессий */
@Injectable()
export class SessionAdapterService {
  /**
   * Конструктор сервиса системы
   * @param {SessionDrizzleRepositoryService} sessionDrizzleRepositoryService — Экземпляр сервиса модуля репозитория для работы с данными сессий через схему сессии
   */
  constructor(
    private sessionDrizzleRepositoryService: SessionDrizzleRepositoryService,
  ) {}

  /**
   * Метод чтения сессий у репозитория сессий
   * @param {ReadQueryAdapter<ISessionFull>[]} selectionConditions - Данные для чтения сессий из репозитория
   * @returns {Promise<AdapterResultRepo<ISessionFull | null>>} - Результат чтения сессий из репозитория
   * @public
   */
  public async readOneBySlug(
    selectionConditions: ReadQueryAdapter<ISessionFull>[],
  ): Promise<AdapterResultRepo<ISessionFull | null>> {
    /** Результаты чтения сессии */
    const resultRead =
      await this.sessionDrizzleRepositoryService.readOneBySlug(
        selectionConditions,
      );

    return {
      error: resultRead.error,
      adaptData: resultRead.data,
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
  ): Promise<AdapterResultRepo<ISessionFull[] | null>> {
    /** Результаты чтения сессий */
    const resultListRead =
      await this.sessionDrizzleRepositoryService.readListByAccountId(accountId);

    return {
      error: resultListRead.error,
      adaptData: resultListRead.data,
    };
  }

  /**
   * Создаёт новую сессию
   * @param {ISessionBase} sessionBase - Данные для создания сессии
   * @returns {Promise<AdapterResultRepo<null>>} - Результат создания сессии (true - успех | false - не получилось создать аккаунт)
   * @public
   */
  public async create(
    sessionBase: ISessionBase,
  ): Promise<AdapterResultRepo<null>> {
    /** Результаты чтения аккаунта */
    const resultCreated =
      await this.sessionDrizzleRepositoryService.create(sessionBase);

    return {
      error: resultCreated.error,
      adaptData: resultCreated.data,
    };
  }

  /**
   * Атомарный upsert сессии: создаёт новую или обновляет существующую по (accountId, ip, ua)
   * @param {ISessionBase} sessionBase - Данные сессии
   * @returns {Promise<AdapterResultRepo<null>>} - Результат операции
   * @public
   */
  public async upsert(
    sessionBase: ISessionBase,
  ): Promise<AdapterResultRepo<null>> {
    const result =
      await this.sessionDrizzleRepositoryService.upsert(sessionBase);

    return {
      error: result.error,
      adaptData: result.data,
    };
  }

  /**
   * Обновление сессии
   * @param {ISessionUpdate} sessionUpdate - Данные сессии для обновления
   * @returns {Promise<AdapterResultRepo<null>>} - Данные обновления сессии
   * @public
   */
  public async update(
    sessionUpdate: ISessionUpdate,
  ): Promise<AdapterResultRepo<null>> {
    const resultUpdate = await this.sessionDrizzleRepositoryService.update({
      id: sessionUpdate.id,
      sessionData: sessionUpdate.sessionData,
    });

    return {
      error: resultUpdate.error,
      adaptData: resultUpdate.data,
    };
  }

  /**
   * Метод удаления найденной сессии
   * @param {string} id - Идентификатор найденной сессии для удаления
   * @returns {: Promise<AdapterResultRepo<null>>} - Данные удаленной сессии
   * @public
   */
  public async delete(id: string): Promise<AdapterResultRepo<null>> {
    const resultDelete = await this.sessionDrizzleRepositoryService.delete(id);

    return {
      error: resultDelete.error,
      adaptData: resultDelete.data,
    };
  }
}
