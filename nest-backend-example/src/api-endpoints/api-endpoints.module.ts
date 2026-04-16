import { Module } from '@nestjs/common';
import { ApiAccountModule } from './account/api-account.module';
import { ApiSessionModule } from './session/session.module';

/** Модуль всех REST-API эндпоинтов */
@Module({
  imports: [ApiAccountModule, ApiSessionModule],
  exports: [],
  controllers: [],
  providers: [],
})
export class ApiEndpointsModule {}
