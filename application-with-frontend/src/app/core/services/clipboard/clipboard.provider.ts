import type { PlatformDetectorService } from '../platform/platform.service';
import type { ClipboardService } from './clipboard.service';
import { ClipboardElectronService } from './clipboard-electron.service';
import { ClipboardCapacitorService } from './clipboard-capacitor.service';
import { ClipboardWebService } from './clipboard-web.service';

/**
 * Фабрика ClipboardService — выбирает реализацию по платформе.
 * @param platform - Сервис определения платформы.
 * @returns Подходящая реализация ClipboardService.
 */
export function clipboardServiceFactory(platform: PlatformDetectorService): ClipboardService {
  if (platform.isElectron) return new ClipboardElectronService();
  if (platform.isMobile) return new ClipboardCapacitorService();
  return new ClipboardWebService();
}
