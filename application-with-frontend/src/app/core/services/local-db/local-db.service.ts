/**
 * Абстрактный сервис локальной SQLite-БД (per-account файл).
 * Electron: better-sqlite3 в main process через IPC.
 * Capacitor: @capacitor-community/sqlite (iOS / Android).
 * Web: заглушка — чаты недоступны в браузере.
 */
export abstract class LocalDbService {
  /**
   * Открывает (или создаёт) БД для аккаунта и применяет схему.
   * Вызывается один раз после успешной авторизации / восстановления токенов.
   * @param accountId - ID аккаунта — определяет имя файла БД.
   */
  public abstract initialize(accountId: string): Promise<void>;

  /**
   * Выполняет запись (INSERT / UPDATE / DELETE).
   * @param sql - SQL-выражение с позиционными параметрами (?).
   * @param params - Значения параметров.
   */
  public abstract run(sql: string, params?: readonly unknown[]): Promise<void>;

  /**
   * Выполняет SELECT и возвращает все строки.
   * @param sql - SQL-выражение с позиционными параметрами (?).
   * @param params - Значения параметров.
   * @returns Массив строк как plain objects.
   */
  public abstract all<T>(sql: string, params?: readonly unknown[]): Promise<readonly T[]>;

  /**
   * Выполняет SELECT и возвращает первую строку или undefined.
   * @param sql - SQL-выражение с позиционными параметрами (?).
   * @param params - Значения параметров.
   * @returns Первая строка или undefined.
   */
  public abstract get<T>(sql: string, params?: readonly unknown[]): Promise<T | undefined>;
}
