import { PlatformDetectorService } from '../platform/platform.service';
import { StorageService } from './storage.service';
import { StorageCapacitorService } from './storage-capacitor.service';
import { StorageElectronService } from './storage-electron.service';
import { StorageWebService } from './storage-web.service';

export function storageServiceFactory(platform: PlatformDetectorService): StorageService {
  if (platform.isMobile) return new StorageCapacitorService();
  if (platform.isElectron) return new StorageElectronService();
  return new StorageWebService();
}
