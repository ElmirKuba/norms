import type { PlatformDetectorService } from '../platform/platform.service';
import type { LocalDbService } from './local-db.service';
import { LocalDbElectronService } from './local-db-electron.service';
import { LocalDbCapacitorService } from './local-db-capacitor.service';
import { LocalDbWebService } from './local-db-web.service';

/**
 * Фабрика LocalDbService — выбирает реализацию по платформе.
 * @param platform - Сервис определения платформы.
 * @returns Подходящая реализация LocalDbService.
 */
export function localDbServiceFactory(platform: PlatformDetectorService): LocalDbService {
  if (platform.isElectron) return new LocalDbElectronService();
  if (platform.isMobile) return new LocalDbCapacitorService();
  return new LocalDbWebService();
}
