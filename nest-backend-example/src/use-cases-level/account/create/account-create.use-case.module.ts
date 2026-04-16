import { Module } from '@nestjs/common';
import { AccountCreateUseCaseService } from './account-create.use-case.service';
import { AccountReadManagerModule } from '../../../managers-level/account/read/account-read.manager.module';
import { AccountCreateManagerModule } from '../../../managers-level/account/create/account-create.manager.module';

/** Модуль бизнес логики уровня UseCase создания аккаунта */
@Module({
  imports: [AccountReadManagerModule, AccountCreateManagerModule],
  exports: [AccountCreateUseCaseService],
  controllers: [],
  providers: [AccountCreateUseCaseService],
})
export class AccountCreateUseCaseModule {}
