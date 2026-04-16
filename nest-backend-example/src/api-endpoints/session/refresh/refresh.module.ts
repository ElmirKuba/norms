import { Module } from '@nestjs/common';
import { ApiRefreshSessionController } from './refresh.controller';
import { SessionRefreshUseCaseModule } from '../../../use-cases-level/session/refresh/refresh.use-case.module';

/** Модуль REST-API контроллера связанного с функционалом обновления сессии */
@Module({
  imports: [SessionRefreshUseCaseModule],
  exports: [],
  controllers: [ApiRefreshSessionController],
  providers: [],
})
export class ApiRefreshSessionModule {}
