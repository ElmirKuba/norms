import { type OperatingSystem } from '../../../../core/services/platform/platform.service';

/** Кнопка скачивания приложения */
export interface DownloadButtonItem {
  /** Операционная система */
  osType: OperatingSystem;
  /** Наименование кнопки */
  label: string;
  /** Наименование операционной системы */
  name: string;
  /** Ссылка на скачивание */
  downloadLink: string | null;
}
