import { LocalDbService } from './local-db.service';

/**
 * Реализация LocalDbService для Electron.
 * Делегирует операции в main process через IPC — SQLite работает в Node.js окружении.
 */
export class LocalDbElectronService extends LocalDbService {
  /** ID текущего аккаунта, устанавливается при initialize. */
  private _accountId: string = '';

  /**
   * Открывает (или создаёт) per-account БД в userData и применяет схему.
   * @param accountId - ID аккаунта.
   */
  public async initialize(accountId: string): Promise<void> {
    this._accountId = accountId;
    await window.electronAPI?.localDb.init(accountId);
  }

  /**
   * Выполняет запись через IPC.
   * @param sql - SQL с позиционными параметрами.
   * @param params - Значения параметров.
   */
  public async run(sql: string, params: readonly unknown[] = []): Promise<void> {
    if (window.electronAPI === undefined) return;
    await window.electronAPI.localDb.run(this._accountId, sql, params);
  }

  /**
   * Читает все строки через IPC.
   * @param sql - SELECT-запрос.
   * @param params - Значения параметров.
   * @returns Массив строк.
   */
  public async all<T>(sql: string, params: readonly unknown[] = []): Promise<readonly T[]> {
    if (window.electronAPI === undefined) return [];
    return window.electronAPI.localDb.all<T>(this._accountId, sql, params);
  }

  /**
   * Читает первую строку через IPC.
   * @param sql - SELECT-запрос.
   * @param params - Значения параметров.
   * @returns Первая строка или undefined.
   */
  public async get<T>(sql: string, params: readonly unknown[] = []): Promise<T | undefined> {
    if (window.electronAPI === undefined) return undefined;
    return window.electronAPI.localDb.get<T>(this._accountId, sql, params);
  }
}
