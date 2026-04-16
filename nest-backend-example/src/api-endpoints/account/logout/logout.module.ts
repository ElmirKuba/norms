import { Module } from '@nestjs/common';
import { ApiLogoutAccountController } from './logout.controller';
import { AccountLogoutUseCaseModule } from '../../../use-cases-level/account/logout/logout.use-case.module';
import { GuardsUtilityModule } from '../../../utility-level/guards/guards.utility.module';

/** Модуль REST-API связанного с функционалом выхода из аккаунта */
@Module({
  imports: [GuardsUtilityModule, AccountLogoutUseCaseModule],
  exports: [],
  controllers: [ApiLogoutAccountController],
  providers: [],
})
export class ApiLogoutAccountModule {}
