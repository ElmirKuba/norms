import { StorageService } from './storage.service';

/** Реализация StorageService через localStorage (браузер-заглушка) */
export class StorageWebService extends StorageService {
  /**
   * Возвращает значение из localStorage по ключу.
   * @param key - Ключ записи
   * @returns Строковое значение или null, если ключ отсутствует
   */
  public get(key: string): Promise<string | null> {
    return Promise.resolve(localStorage.getItem(key));
  }

  /**
   * Сохраняет значение в localStorage.
   * @param key - Ключ записи
   * @param value - Значение для сохранения
   * @returns Промис, разрешающийся после сохранения
   */
  public set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }

  /**
   * Удаляет запись из localStorage.
   * @param key - Ключ записи
   * @returns Промис, разрешающийся после удаления
   */
  public remove(key: string): Promise<void> {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
}
