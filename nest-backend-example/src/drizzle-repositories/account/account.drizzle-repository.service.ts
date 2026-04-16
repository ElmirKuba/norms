import { Injectable } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { accountSchema } from '../../system/orm-schemas/account.schema';
import { InjectDrizzle } from '@knaadh/nestjs-drizzle-mysql2';
import { IAccountPure } from '../../interfaces/pure-and-base/account/account-pure.interface';
import { ReadQueryRepository } from '../../interfaces/orm-repositories/read-query.repository.interface';
import { IAccountFull } from '../../interfaces/full/account/account-full.interface';
import { ResultQueryRepository } from '../../interfaces/orm-repositories/result-query.repository.interface';
import { IAccountUpdate } from '../../interfaces/with-child/account/account-update.interface';

/** Сервис модуля репозитория для работы данными аккаунта через схему аккаунта */
@Injectable()
export class AccountDrizzleRepositoryService {
  /**
   * Конструктор сервиса системы
   * @param db — Drizzle‑клиент для MySQL, инжектится из SystemModule под токеном 'DRIZZLE_DB_MYSQL_ONE'
   */
  constructor(
    @InjectDrizzle('DRIZZLE_DB_MYSQL_ONE')
    private readonly db: MySql2Database<{
      account: typeof accountSchema;
    }>,
  ) {}

  /**
   * Создаёт нового пользователя.
   * @param data — объект с полями login и password (id генерируется здесь)
   * @returns {Promise<ResultQueryRepository<null>>} - Результат создания аккаунта (true - успех | false - не получилось создать аккаунт)
   * @public
   */
  public async create(
    dataForNewAccount: IAccountPure,
  ): Promise<ResultQueryRepository<null>> {
    /** UUID_V4 идентификатор */
    const tempUuidV4 = uuidv4();
    /** Кол-во мс сейчас */
    const tempMilliseconds = Date.now();
    /** Формируем идентификатор вида uuid-v4_unixtime(13length) */
    const id = `${tempUuidV4}_${tempMilliseconds}`;

    /** Результат создания аккаунта */
    const resultCreated = await this.db
      .insert(accountSchema)
      .values({ id, ...dataForNewAccount });

    return {
      error: resultCreated[0].affectedRows ? false : true,
      data: null,
    };
  }

  /**
   * Читает аккаунт из таблицы СуБД
   * @param {RepositoryRead<IAccountFull>} selectionConditions - Данные для чтения аккаунта из таблицы СуБД
   * @returns {Promise<ResultQueryRepository<IAccountFull | null>>} - Результат чтения аккаунта из таблицы СуБД
   * @public
   */
  public async readOneBySlug(
    selectionConditions: ReadQueryRepository<IAccountFull>,
  ): Promise<ResultQueryRepository<IAccountFull | null>> {
    if (!selectionConditions.columnName || !selectionConditions.columnValue) {
      return {
        error: true,
        data: null,
      };
    }

    /** Whitelist допустимых колонок для динамического выбора по slug */
    const allowedColumns = ['id', 'login', 'password'] as const;
    type AllowedColumn = (typeof allowedColumns)[number];

    if (
      !(allowedColumns as readonly string[]).includes(
        selectionConditions.columnName,
      )
    ) {
      return {
        error: true,
        data: null,
      };
    }

    /** Ссылка на столбец таблицы (после whitelist-проверки безопасно) */
    const columnRef =
      accountSchema[selectionConditions.columnName as AllowedColumn];

    /** Результат чтения аккаунта */
    const resultRead = await this.db
      .select()
      .from(accountSchema)
      .where(eq(columnRef, selectionConditions.columnValue))
      .limit(1);

    if (!resultRead[0]) {
      return {
        error: true,
        data: null,
      };
    }

    return {
      error: false,
      data: {
        id: resultRead[0].id as string,
        login: resultRead[0].login as string,
        password: resultRead[0].password as string,
      },
    };
  }

  /**
   * Обновляет аккаунт в таблице СуБД
   * @param {IAccountUpdate} accountUpdateData - Данные аккаунта полученные от пользователя API; при наличии пароля он уже захеширован bcrypt
   * @returns {Promise<ResultQueryRepository<null>>} - Результат работы метода репозитория который обновляет данные аккаунта
   * @public
   */
  public async update(
    accountUpdateData: IAccountUpdate,
  ): Promise<ResultQueryRepository<null>> {
    /** Результат обновления аккаунта */
    const resultUpdate = await this.db
      .update(accountSchema)
      .set({ ...accountUpdateData.accountData })
      .where(eq(accountSchema.id, accountUpdateData.id));

    return {
      error: resultUpdate[0].affectedRows ? false : true,
      data: null,
    };
  }
}
