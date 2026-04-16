import { Module } from '@nestjs/common';
import { ApiCreateAccountController } from './api-create-account.controller';
import { AccountCreateUseCaseModule } from '../../../use-cases-level/account/create/account-create.use-case.module';

/** Модуль REST-API контроллера связанного с функционалом создания аккаунта */
@Module({
  imports: [AccountCreateUseCaseModule],
  exports: [],
  controllers: [ApiCreateAccountController],
  providers: [],
})
export class ApiCreateAccountModule {}
