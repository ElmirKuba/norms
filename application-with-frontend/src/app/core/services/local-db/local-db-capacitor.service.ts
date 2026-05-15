import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import { LOCAL_DB_MIGRATIONS, LOCAL_DB_SCHEMA } from './local-db.schema';
import { LocalDbService } from './local-db.service';

const sqlite = new SQLiteConnection(CapacitorSQLite);

/**
 * Реализация LocalDbService для Capacitor (iOS / Android).
 * Использует @capacitor-community/sqlite — нативная SQLite через Capacitor plugin.
 */
export class LocalDbCapacitorService extends LocalDbService {
  /** Активное соединение с БД текущего аккаунта. */
  private _db: SQLiteDBConnection | null = null;

  /**
   * Открывает (или создаёт) per-account БД и применяет схему.
   * При повторном вызове переиспользует существующее соединение.
   * @param accountId - ID аккаунта.
   */
  public async initialize(accountId: string): Promise<void> {
    const dbName = `norms-${accountId}`;
    const isConn = await sqlite.isConnection(dbName, false);
    if (isConn.result === true) {
      this._db = await sqlite.retrieveConnection(dbName, false);
    } else {
      try {
        this._db = await sqlite.createConnection(dbName, false, 'no-encryption', 1, false);
      } catch {
        // Race condition: parallel initialize() created connection first
        this._db = await sqlite.retrieveConnection(dbName, false);
      }
    }
    await this._db.open();
    await this._db.execute(LOCAL_DB_SCHEMA);

    // Миграции запускаем по одному — ошибка «duplicate column» игнорируется
    for (const migration of LOCAL_DB_MIGRATIONS) {
      try {
        await this._db.execute(migration);
      } catch {
        // Колонка уже существует — ожидаемо на повторных запусках
      }
    }
  }

  /**
   * Выполняет запись.
   * @param sql - SQL с позиционными параметрами.
   * @param params - Значения параметров.
   */
  public async run(sql: string, params: readonly unknown[] = []): Promise<void> {
    if (this._db === null) return;
     
    await this._db.run(sql, params as unknown[]);
  }

  /**
   * Читает все строки.
   * @param sql - SELECT-запрос.
   * @param params - Значения параметров.
   * @returns Массив строк.
   */
  public async all<T>(sql: string, params: readonly unknown[] = []): Promise<readonly T[]> {
    if (this._db === null) return [];
     
    const result = await this._db.query(sql, params as unknown[]);
     
    return (result.values ?? []) as T[];
  }

  /**
   * Читает первую строку.
   * @param sql - SELECT-запрос.
   * @param params - Значения параметров.
   * @returns Первая строка или undefined.
   */
  public async get<T>(sql: string, params: readonly unknown[] = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }
}
