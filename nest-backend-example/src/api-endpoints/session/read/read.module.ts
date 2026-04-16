import { Module } from '@nestjs/common';
import { ApiReadSessionController } from './read.controller';
import { SessionReadUseCaseModule } from '../../../use-cases-level/session/read/read.use-case.module';
import { GuardsUtilityModule } from '../../../utility-level/guards/guards.utility.module';

/** Модуль REST-API контроллера связанного с функционалом чтения сессий */
@Module({
  imports: [GuardsUtilityModule, SessionReadUseCaseModule],
  exports: [],
  controllers: [ApiReadSessionController],
  providers: [],
})
export class ApiReadSessionModule {}
