import { ClipboardService } from './clipboard.service';

/** Реализация ClipboardService для Electron — делегирует navigator.clipboard (Chromium). */
export class ClipboardElectronService extends ClipboardService {
  /**
   * @inheritdoc
   * @param text - Текст для копирования.
   */
  public override write(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }
}
