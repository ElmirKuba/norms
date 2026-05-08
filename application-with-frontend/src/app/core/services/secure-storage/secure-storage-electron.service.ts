import { SecureStorageService } from './secure-storage.service';

/**
 * Реализация SecureStorageService для Electron.
 * Делегирует main process через IPC — шифрование через Electron safeStorage:
 * macOS → Keychain, Windows → DPAPI, Linux → libsecret.
 * Реализация одна для всех трёх ОС, разница только в бэкенде шифрования.
 */
export class SecureStorageElectronService extends SecureStorageService {
  /**
   * Возвращает расшифрованное значение по ключу через IPC.
   * @param key - Ключ записи.
   * @returns Значение или null если ключ отсутствует.
   */
  public get(key: string): Promise<string | null> {
    return window.electronAPI?.secureStorage.get(key) ?? Promise.resolve(null);
  }

  /**
   * Шифрует и сохраняет значение через IPC в main process.
   * @param key - Ключ записи.
   * @param value - Значение для сохранения.
   * @returns Промис, разрешающийся после сохранения.
   */
  public set(key: string, value: string): Promise<void> {
    return window.electronAPI?.secureStorage.set(key, value) ?? Promise.resolve();
  }

  /**
   * Удаляет запись через IPC.
   * @param key - Ключ записи.
   * @returns Промис, разрешающийся после удаления.
   */
  public remove(key: string): Promise<void> {
    return window.electronAPI?.secureStorage.remove(key) ?? Promise.resolve();
  }
}
