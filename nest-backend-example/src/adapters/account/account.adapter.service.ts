import { Injectable } from '@nestjs/common';
import { IAccountFull } from '../../interfaces/full/account/account-full.interface';
import { ReadQueryAdapter } from '../../interfaces/adapters/read-query.adapter.interface';
import { AdapterResultRepo } from '../../interfaces/adapters/result-query.adapter.interface';
import { AccountDrizzleRepositoryService } from '../../drizzle-repositories/account/account.drizzle-repository.service';
import { ResultQueryRepository } from '../../interfaces/orm-repositories/result-query.repository.interface';
import { IAccountPure } from '../../interfaces/pure-and-base/account/account-pure.interface';
import { IAccountUpdate } from '../../interfaces/with-child/account/account-update.interface';

/** Сервис модуля адаптера репозитория для аккаунтов */
@Injectable()
export class AccountAdapterService {
  /**
   * Конструктор сервиса системы
   * @param {AccountDrizzleRepositoryService} accountDrizzleRepositoryService — Экземпляр сервиса модуля репозитория для работы с данными аккаунта через схему аккаунта
   */
  constructor(
    private accountDrizzleRepositoryService: AccountDrizzleRepositoryService,
  ) {}

  /**
   * Создаёт нового пользователя в СуБД используя репозиторий схемы таблицы аккаунтов
   * @param {IAccountPure} dataForNewAccount — объект с полями login и password (id генерируется здесь)
   * @returns {Promise<AdapterResultRepo<null>>} - Результат создания аккаунта (true - успех | false - не получилось создать аккаунт)
   * @public
   */
  public async create(
    dataForNewAccount: IAccountPure,
  ): Promise<AdapterResultRepo<null>> {
    /** Результаты создания аккаунта */
    const resultCreate: ResultQueryRepository<null> =
      await this.accountDrizzleRepositoryService.create(dataForNewAccount);

    return {
      error: resultCreate.error,
      adaptData: resultCreate.data,
    };
  }

  /**
   * Метод чтения аккаунта у репозитория аккаунтов
   * @param {ReadQueryAdapter<IAccountFull>} selectionConditions - Данные для чтения аккаунта из репозитория
   * @returns {Promise<AdapterResultRepo<IAccountFull | null>>} - Результат чтения аккаунта из репозитория
   * @public
   */
  public async readOneBySlug(
    selectionConditions: ReadQueryAdapter<IAccountFull>,
  ): Promise<AdapterResultRepo<IAccountFull | null>> {
    /** Результаты чтения аккаунта */
    const resultRead: ResultQueryRepository<IAccountFull | null> =
      await this.accountDrizzleRepositoryService.readOneBySlug({
        columnName: selectionConditions.columnName,
        columnValue: selectionConditions.columnValue,
      });

    return {
      error: resultRead.error,
      adaptData: resultRead.data,
    };
  }

  /**
   * Обновляет данные аккаунта в СуБД используя репозиторий схемы таблицы аккаунтов
   * @param {IAccountUpdate} accountUpdateData - Данные аккаунта полученные от пользователя API; при наличии пароля он уже захеширован bcrypt
   * @returns {Promise<AdapterResultRepo<null>>} - Результат работы метода адаптера который работает с методом обновления данных аккаунта репозитория
   * @public
   */
  public async update(
    accountUpdateData: IAccountUpdate,
  ): Promise<AdapterResultRepo<null>> {
    /** Результаты создания аккаунта */
    const resultUpdate =
      await this.accountDrizzleRepositoryService.update(accountUpdateData);

    return {
      error: resultUpdate.error,
      adaptData: resultUpdate.data,
    };
  }
}
