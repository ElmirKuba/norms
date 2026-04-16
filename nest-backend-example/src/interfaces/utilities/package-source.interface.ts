/** Интерфейс описывающий нужные свойства для работы из package.json */
export interface PackageSource {
  /** Техническое наименование Backend-части проекта */
  name: string;
  /** Версия Backend-части проекта */
  version: string;
  /** Техническое описание Backend-части проекта */
  description: string;
  /** Никнейм разработчика Backend-части проекта */
  author: string;
  /** TODO: ElmirKuba 2025-08-22: Описать что это в будущем на основе документации */
  private: boolean;
  /** TODO: ElmirKuba 2025-08-22: Описать что это в будущем на основе документации */
  license: 'UNLICENSED';
  /** Скрипты используемые для запуска проекта */
  scripts: Record<string, string>;
  /** Зависимости и их версии, которые используется в работе проекта */
  dependencies: Record<string, string>;
  /** Зависимости и их версии, которые используется в разработке проекта */
  devDependencies: Record<string, string>;
  /** TODO: ElmirKuba 2025-08-22: Описать что это в будущем на основе документации */
  jest: Record<string, string>;
  /** Ссылка на сайт разработчика */
  websiteDeveloper: string;
  /** E-Mail разработчика */
  emailDeveloper: string;
}
