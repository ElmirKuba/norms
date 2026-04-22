import type { PlatformDetectorService } from '../platform/platform.service';
import type { StorageService } from './storage.service';
import { StorageCapacitorService } from './storage-capacitor.service';
import { StorageElectronService } from './storage-electron.service';
import { StorageWebService } from './storage-web.service';

/**
 * Фабрика StorageService — выбирает реализацию в зависимости от платформы.
 * @param platform - Сервис определения платформы
 * @returns Подходящая реализация StorageService
 */
export function storageServiceFactory(platform: PlatformDetectorService): StorageService {
  if (platform.isMobile) return new StorageCapacitorService();
  if (platform.isElectron) return new StorageElectronService();
  return new StorageWebService();
}
