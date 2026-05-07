import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Форма ответа feature-flags. */
interface FeatureFlagsResult {
  /** Регистрация без инвайт-кода. */
  readonly free_registration: boolean;
  /** Показывать dev-элементы UI. */
  readonly dev_mode: boolean;
}

/** Контроллер конфигурации приложения (публичный). */
@Controller('app')
export class AppConfigController {
  public constructor(private readonly _config: ConfigService) {}

  /**
   * Возвращает feature flags для клиентских приложений.
   * @returns Набор флагов.
   */
  @Get('feature-flags')
  public featureFlags(): FeatureFlagsResult {
    return {
      free_registration: this._config.get<string>('FEATURE_FREE_REGISTRATION', 'false') === 'true',
      dev_mode: this._config.get<string>('FEATURE_DEV_MODE', 'false') === 'true',
    };
  }
}
