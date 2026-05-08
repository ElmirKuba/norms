import { SecureStorageService } from './secure-storage.service';

/**
 * Браузерная заглушка SecureStorageService.
 * Веб-лендинг не поддерживает регистрацию/авторизацию — хранить токены не нужно.
 */
export class SecureStorageWebService extends SecureStorageService {
  /**
   * Недоступно в браузере.
   * @param _key - Ключ записи.
   * @returns Никогда не возвращает значение.
   * @throws Error — secure storage недоступен в браузере.
   */
  public get(_key: string): Promise<string | null> {
    throw new Error('SecureStorageWebService: not available in browser. Use native app.');
  }

  /**
   * Недоступно в браузере.
   * @param _key - Ключ записи.
   * @param _value - Значение для сохранения.
   * @returns Никогда не разрешается.
   * @throws Error — secure storage недоступен в браузере.
   */
  public set(_key: string, _value: string): Promise<void> {
    throw new Error('SecureStorageWebService: not available in browser. Use native app.');
  }

  /**
   * Недоступно в браузере.
   * @param _key - Ключ записи.
   * @returns Никогда не разрешается.
   * @throws Error — secure storage недоступен в браузере.
   */
  public remove(_key: string): Promise<void> {
    throw new Error('SecureStorageWebService: not available in browser. Use native app.');
  }
}
