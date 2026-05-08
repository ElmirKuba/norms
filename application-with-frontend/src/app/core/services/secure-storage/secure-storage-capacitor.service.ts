import { SecureStorageService } from './secure-storage.service';

/**
 * Реализация SecureStorageService для Capacitor (iOS/Android).
 *
 * TODO: реализовать через @capacitor-community/secure-storage-plugin
 * который оборачивает iOS Keychain и Android Keystore.
 * Установка: npm install @capacitor-community/secure-storage-plugin && npx cap sync
 * Документация: https://github.com/martinkasa/capacitor-secure-storage-plugin
 *
 * Текущая заглушка бросает ошибку чтобы сделать отсутствие реализации явным при разработке.
 */
export class SecureStorageCapacitorService extends SecureStorageService {
  /**
   * Не реализовано — требует @capacitor-community/secure-storage-plugin.
   * @param _key - Ключ записи.
   * @returns Никогда не возвращает значение.
   * @throws Error — Capacitor secure storage не реализован.
   */
  public get(_key: string): Promise<string | null> {
    throw new Error('SecureStorageCapacitorService: not yet implemented. Install @capacitor-community/secure-storage-plugin.');
  }

  /**
   * Не реализовано — требует @capacitor-community/secure-storage-plugin.
   * @param _key - Ключ записи.
   * @param _value - Значение для сохранения.
   * @returns Никогда не разрешается.
   * @throws Error — Capacitor secure storage не реализован.
   */
  public set(_key: string, _value: string): Promise<void> {
    throw new Error('SecureStorageCapacitorService: not yet implemented. Install @capacitor-community/secure-storage-plugin.');
  }

  /**
   * Не реализовано — требует @capacitor-community/secure-storage-plugin.
   * @param _key - Ключ записи.
   * @returns Никогда не разрешается.
   * @throws Error — Capacitor secure storage не реализован.
   */
  public remove(_key: string): Promise<void> {
    throw new Error('SecureStorageCapacitorService: not yet implemented. Install @capacitor-community/secure-storage-plugin.');
  }
}
