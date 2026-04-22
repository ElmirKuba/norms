import { Preferences } from '@capacitor/preferences';
import { StorageService } from './storage.service';

/** Реализация StorageService через Capacitor Preferences (iOS/Android) */
export class StorageCapacitorService extends StorageService {
  /**
   * Возвращает значение из Capacitor Preferences по ключу.
   * @param key - Ключ записи
   * @returns Строковое значение или null, если ключ отсутствует
   */
  public async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  /**
   * Сохраняет значение в Capacitor Preferences.
   * @param key - Ключ записи
   * @param value - Значение для сохранения
   * @returns Промис, разрешающийся после сохранения
   */
  public async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  /**
   * Удаляет запись из Capacitor Preferences.
   * @param key - Ключ записи
   * @returns Промис, разрешающийся после удаления
   */
  public async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
