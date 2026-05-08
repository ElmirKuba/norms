/**
 * Абстрактный сервис защищённого хранилища — контракт для JWT-токенов и других чувствительных данных.
 * Electron: шифрование через safeStorage (OS keychain).
 * Capacitor: iOS Keychain / Android Keystore (TODO).
 * Web: недоступно (лендинг не требует хранилища).
 */
export abstract class SecureStorageService {
  /**
   * Возвращает расшифрованное значение по ключу.
   * @param key - Ключ записи.
   * @returns Значение или null если ключ отсутствует.
   */
  public abstract get(key: string): Promise<string | null>;

  /**
   * Шифрует и сохраняет значение по ключу.
   * @param key - Ключ записи.
   * @param value - Значение для сохранения.
   */
  public abstract set(key: string, value: string): Promise<void>;

  /**
   * Удаляет запись по ключу.
   * @param key - Ключ записи.
   */
  public abstract remove(key: string): Promise<void>;
}
