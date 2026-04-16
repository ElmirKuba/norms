import { Module } from '@nestjs/common';
import { ApiAuthAccountController } from './api-auth-account.controller';
import { AccountAuthUseCaseModule } from '../../../use-cases-level/account/auth/account-auth.use-case.module';

/** Модуль REST-API контроллера связанного с функционалом авторизации аккаунта */
@Module({
  imports: [AccountAuthUseCaseModule],
  exports: [],
  controllers: [ApiAuthAccountController],
  providers: [],
})
export class ApiAuthAccountModule {}
