/** Абстрактный сервис хранилища — платформонезависимый контракт */
export abstract class StorageService {
  /**
   * Возвращает значение по ключу.
   * @param key - Ключ записи
   * @returns Строковое значение или null, если ключ отсутствует
   */
  public abstract get(key: string): Promise<string | null>;

  /**
   * Сохраняет значение по ключу.
   * @param key - Ключ записи
   * @param value - Значение для сохранения
   * @returns Промис, разрешающийся после сохранения
   */
  public abstract set(key: string, value: string): Promise<void>;

  /**
   * Удаляет запись по ключу.
   * @param key - Ключ записи
   * @returns Промис, разрешающийся после удаления
   */
  public abstract remove(key: string): Promise<void>;
}
