/**
 * Абстрактный сервис буфера обмена.
 * Electron: navigator.clipboard (Chromium).
 * Capacitor: navigator.clipboard (WKWebView / Android WebView).
 * Web: navigator.clipboard (браузер).
 */
export abstract class ClipboardService {
  /**
   * Записывает текст в системный буфер обмена.
   * @param text - Текст для копирования.
   * @returns Промис, разрешающийся после записи.
   */
  public abstract write(text: string): Promise<void>;
}
