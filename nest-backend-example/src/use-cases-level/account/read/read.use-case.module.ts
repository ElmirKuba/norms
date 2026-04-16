import { Module } from '@nestjs/common';
import { AccountReadUseCaseService } from './read.use-case.service';
import { AccountReadManagerModule } from '../../../managers-level/account/read/account-read.manager.module';

/** Модуль бизнес логики уровня UseCase чтения аккаунта */
@Module({
  imports: [AccountReadManagerModule],
  exports: [AccountReadUseCaseService],
  controllers: [],
  providers: [AccountReadUseCaseService],
})
export class AccountReadUseCaseModule {}
