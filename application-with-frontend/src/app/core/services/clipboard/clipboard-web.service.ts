import { ClipboardService } from './clipboard.service';

/** Реализация ClipboardService для браузера (лендинг). */
export class ClipboardWebService extends ClipboardService {
  /**
   * @inheritdoc
   * @param text - Текст для копирования.
   */
  public override write(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }
}
