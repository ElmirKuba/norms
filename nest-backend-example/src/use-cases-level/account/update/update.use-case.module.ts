import { Module } from '@nestjs/common';
import { AccountUpdateUseCaseService } from './update.use-case.service';
import { AccountReadManagerModule } from '../../../managers-level/account/read/account-read.manager.module';
import { AccountUpdateManagerModule } from '../../../managers-level/account/update/update.manager.module';

/** Модуль бизнес логики уровня UseCase обновления аккаунта */
@Module({
  imports: [AccountReadManagerModule, AccountUpdateManagerModule],
  exports: [AccountUpdateUseCaseService],
  controllers: [],
  providers: [AccountUpdateUseCaseService],
})
export class AccountUpdateUseCaseModule {}
