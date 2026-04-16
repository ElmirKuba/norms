import { Module } from '@nestjs/common';
import { AccountReadManagerService } from './account-read.manager.service';
import { AccountAdapterModule } from '../../../adapters/account/account.adapter.module';

/** Модуль бизнес логики уровня Manager создания аккаунта */
@Module({
  imports: [AccountAdapterModule],
  exports: [AccountReadManagerService],
  controllers: [],
  providers: [AccountReadManagerService],
})
export class AccountReadManagerModule {}
