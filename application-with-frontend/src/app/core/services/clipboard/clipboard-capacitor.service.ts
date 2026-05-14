import { ClipboardService } from './clipboard.service';

/** Реализация ClipboardService для Capacitor — использует navigator.clipboard (WKWebView/Android WebView). */
export class ClipboardCapacitorService extends ClipboardService {
  /**
   * @inheritdoc
   * @param text - Текст для копирования.
   */
  public override write(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }
}
