import { StorageService } from './storage.service';

export class StorageElectronService extends StorageService {
  // В Electron используем localStorage (работает в renderer)
  // Для чувствительных данных — IPC к main process + electron-store / keytar
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
