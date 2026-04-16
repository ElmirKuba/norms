import { Module } from '@nestjs/common';
import { ApiReadAccountController } from './read.controller';
import { AccountReadUseCaseModule } from '../../../use-cases-level/account/read/read.use-case.module';
import { GuardsUtilityModule } from '../../../utility-level/guards/guards.utility.module';

/** Модуль REST-API связанный с функционалом чтения аккаунта */
@Module({
  imports: [GuardsUtilityModule, AccountReadUseCaseModule],
  exports: [],
  controllers: [ApiReadAccountController],
  providers: [],
})
export class ApiReadAccountModule {}
