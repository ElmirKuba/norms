/** Feature flags, загружаемые с бэкенда при старте приложения. */
export interface FeatureFlags {
  /** Регистрация без инвайт-кода. */
  freeRegistration: boolean;
  /** Показывать dev-элементы UI. */
  devMode: boolean;
}
