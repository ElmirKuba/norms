import { Module } from '@nestjs/common';
import { ApiDeleteSessionsController } from './delete.controller';
import { SessionDeleteUseCaseModule } from '../../../use-cases-level/session/delete/delete.use-case.module';
import { GuardsUtilityModule } from '../../../utility-level/guards/guards.utility.module';

/** Модуль REST-API связанного с функционалом удаления других своих сессий */
@Module({
  imports: [GuardsUtilityModule, SessionDeleteUseCaseModule],
  exports: [],
  controllers: [ApiDeleteSessionsController],
  providers: [],
})
export class ApiDeleteSessionsModule {}
