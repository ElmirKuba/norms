/** Feature flags с бэкенда (мок) */
export interface FeatureFlags {
  /** Регистрация без инвайт-кода */
  freeRegistration: boolean;
  /** Dev-режим */
  devMode: boolean;
}

/** Мок feature flags для разработки */
export const MOCK_FEATURE_FLAGS: FeatureFlags = {
  freeRegistration: false,
  devMode: true,
};
