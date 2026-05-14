import { Preferences } from '@capacitor/preferences';
import { SecureStorageService } from './secure-storage.service';

/**
 * Реализация SecureStorageService для Capacitor (iOS/Android).
 * Использует @capacitor/preferences: UserDefaults на iOS, SharedPreferences на Android.
 * Для production рекомендуется заменить на нативный Keychain/Keystore через
 * @capacitor-community/secure-storage-plugin.
 */
export class SecureStorageCapacitorService extends SecureStorageService {
  /**
   * Возвращает значение из Capacitor Preferences по ключу.
   * @param key - Ключ записи.
   * @returns Значение или null если ключ отсутствует.
   */
  public async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  /**
   * Сохраняет значение в Capacitor Preferences.
   * @param key - Ключ записи.
   * @param value - Значение для сохранения.
   */
  public async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  /**
   * Удаляет запись из Capacitor Preferences.
   * @param key - Ключ записи.
   */
  public async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
