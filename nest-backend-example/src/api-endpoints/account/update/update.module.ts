import { Module } from '@nestjs/common';
import { ApiUpdateAccountController } from './update.controller';
import { AccountUpdateUseCaseModule } from '../../../use-cases-level/account/update/update.use-case.module';
import { GuardsUtilityModule } from '../../../utility-level/guards/guards.utility.module';

/** Модуль REST-API связанный с функционалом обновления данных аккаунта */
@Module({
  imports: [GuardsUtilityModule, AccountUpdateUseCaseModule],
  exports: [],
  controllers: [ApiUpdateAccountController],
  providers: [],
})
export class ApiUpdateAccountModule {}
