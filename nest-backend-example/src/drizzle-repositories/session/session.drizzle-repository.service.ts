import { Injectable } from '@nestjs/common';
import { ISessionFull } from '../../interfaces/full/session/session-full.interface';
import { ReadQueryAdapter } from '../../interfaces/adapters/read-query.adapter.interface';
import { sessionSchema } from '../../system/orm-schemas/session.schema';
import { and, eq, SQL } from 'drizzle-orm';
import { ResultQueryRepository } from '../../interfaces/orm-repositories/result-query.repository.interface';
import { InjectDrizzle } from '@knaadh/nestjs-drizzle-mysql2';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { ISessionBase } from '../../interfaces/pure-and-base/session/session-base.interface';
import { v4 as uuidv4 } from 'uuid';
import { ISessionUpdate } from '../../interfaces/with-child/session/session-update.interface';

/** Модуль репозитория для работы с данными сессий через схему сессий */
@Injectable()
export class SessionDrizzleRepositoryService {
  /**
   * Конструктор сервиса системы
   * @param db — Drizzle‑клиент для MySQL, инжектится из SystemModule под токеном 'DRIZZLE_DB_MYSQL_ONE'
   */
  constructor(
    @InjectDrizzle('DRIZZLE_DB_MYSQL_ONE')
    private readonly db: MySql2Database<{
      session: typeof sessionSchema;
    }>,
  ) {}

  /**
   * Читает сессию из таблицы СуБД
   * @param {ReadQueryAdapter<ISessionFull>[]} selectionConditions - Данные для чтения сессии из репозитория
   * @returns {Promise<ResultQueryRepository<ISessionFull | null>>} - Результат чтения сессии из репозитория
   * @public
   */
  public async readOneBySlug(
    selectionConditions: ReadQueryAdapter<ISessionFull>[],
  ): Promise<ResultQueryRepository<ISessionFull | null>> {
    for (const selectionCondition of selectionConditions) {
      if (!selectionCondition.columnName || !selectionCondition.columnValue) {
        return {
          error: true,
          data: null,
        };
      }
    }

    /** Массив drizzle-условий типа eq(...) */
    const conditions = selectionConditions.map((condition) => {
      const columnRef = sessionSchema[condition.columnName];
      return eq(columnRef, condition.columnValue);
    });

    if (conditions.length === 0) {
      return {
        error: true,
        data: null,
      };
    }

    /** Объединяем условия через and(...) — drizzle принимает rest-аргументы */
    const combinedCondition: SQL<unknown> = and(...conditions) as SQL<unknown>;

    /** Результат чтения сессии */
    const resultRead = await this.db
      .select()
      .from(sessionSchema)
      .where(combinedCondition)
      .limit(1);

    if (!resultRead[0]) {
      return {
        error: true,
        data: null,
      };
    }

    const row = resultRead[0];

    return {
      error: false,
      data: {
        id: row.id ?? '',
        accountId: row.accountId ?? '',
        refreshToken: row.refreshToken ?? '',
        ua: row.ua ?? '',
        ip: row.ip ?? '',
        browserData: row.browserData ?? '',
        cpuArchitecture: row.cpuArchitecture ?? '',
        deviceData: row.deviceData ?? '',
        osData: row.osData ?? '',
      },
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
  ): Promise<ResultQueryRepository<ISessionFull[] | null>> {
    /** Результат чтения списка сессий */
    const resultListRead = await this.db
      .select()
      .from(sessionSchema)
      .where(eq(sessionSchema.accountId, accountId));

    if (!resultListRead.length) {
      return {
        error: true,
        data: null,
      };
    }

    return {
      error: false,
      data: resultListRead as ISessionFull[],
    };
  }

  /**
   * Создаёт новую сессию
   * @param {ISessionBase} sessionBase - Данные для создания сессии
   * @returns {Promise<ResultQueryRepository<null>>} - Результат создания сессии
   * @public
   */
  public async create(
    sessionBase: ISessionBase,
  ): Promise<ResultQueryRepository<null>> {
    /** UUID_V4 идентификатор */
    const tempUuidV4 = uuidv4();
    /** Кол-во мс сейчас */
    const tempMilliseconds = Date.now();
    /** Формируем идентификатор вида uuid-v4_unixtime(13length) */
    const id = `${tempUuidV4}_${tempMilliseconds}`;

    /** Результат создания сессии */
    const resultCreated = await this.db.insert(sessionSchema).values({
      id,
      ...sessionBase,
    });

    return {
      error: resultCreated[0].affectedRows ? false : true,
      data: null,
    };
  }

  /**
   * Атомарный upsert сессии: INSERT при отсутствии или UPDATE при совпадении (accountId, ip, ua)
   * @param {ISessionBase} sessionBase - Данные сессии
   * @returns {Promise<ResultQueryRepository<null>>} - Результат операции
   * @public
   */
  public async upsert(
    sessionBase: ISessionBase,
  ): Promise<ResultQueryRepository<null>> {
    const tempUuidV4 = uuidv4();
    const tempMilliseconds = Date.now();
    const id = `${tempUuidV4}_${tempMilliseconds}`;

    const result = await this.db
      .insert(sessionSchema)
      .values({ id, ...sessionBase })
      .onDuplicateKeyUpdate({
        set: {
          refreshToken: sessionBase.refreshToken,
          browserData: sessionBase.browserData,
          cpuArchitecture: sessionBase.cpuArchitecture,
          deviceData: sessionBase.deviceData,
          osData: sessionBase.osData,
        },
      });

    return {
      error: result[0].affectedRows ? false : true,
      data: null,
    };
  }

  /**
   * Обновляет сессию по её ID
   * @param {ISessionUpdate} sessionUpdate - Данные сессии для обновления
   * @returns {Promise<ResultQueryRepository<null>>} - Результат работы метода обновления сессии
   * @public
   */
  public async update(
    sessionUpdate: ISessionUpdate,
  ): Promise<ResultQueryRepository<null>> {
    /** Результат обновления сессии */
    const resultUpdated = await this.db
      .update(sessionSchema)
      .set(sessionUpdate.sessionData)
      .where(eq(sessionSchema.id, sessionUpdate.id));

    return {
      error: resultUpdated[0].affectedRows ? false : true,
      data: null,
    };
  }

  /**
   * Удаляет сессию по ее ID
   * @param {string} id - Идентификатор сессии для удаления
   * @returns {Promise<RepositoryResult<null>>}
   * @public
   */
  public async delete(id: string): Promise<ResultQueryRepository<null>> {
    /** Результат удаления сессии */
    const resultDeleted = await this.db
      .delete(sessionSchema)
      .where(eq(sessionSchema.id, id));

    return {
      error: resultDeleted[0].affectedRows ? false : true,
      data: null,
    };
  }
}
