import type { PlatformDetectorService } from '../platform/platform.service';
import type { SecureStorageService } from './secure-storage.service';
import { SecureStorageElectronService } from './secure-storage-electron.service';
import { SecureStorageCapacitorService } from './secure-storage-capacitor.service';
import { SecureStorageWebService } from './secure-storage-web.service';

/**
 * Фабрика SecureStorageService — выбирает реализацию по платформе.
 * @param platform - Сервис определения платформы.
 * @returns Подходящая реализация SecureStorageService.
 */
export function secureStorageServiceFactory(platform: PlatformDetectorService): SecureStorageService {
  if (platform.isElectron) return new SecureStorageElectronService();
  if (platform.isMobile) return new SecureStorageCapacitorService();
  return new SecureStorageWebService();
}
