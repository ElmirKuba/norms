import { Module } from '@nestjs/common';
import { AppConfigController } from './app-config.controller';

/** Модуль конфигурации приложения: публичные эндпоинты (feature-flags). */
@Module({
  controllers: [AppConfigController],
})
export class AppConfigModule {}
