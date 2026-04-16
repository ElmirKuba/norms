import { Module } from '@nestjs/common';
import { AccountCreateManagerService } from './account-create.manager.service';
import { AccountAdapterModule } from 'src/adapters/account/account.adapter.module';

/** Модуль бизнес логики уровня Manager создания аккаунта */
@Module({
  imports: [AccountAdapterModule],
  exports: [AccountCreateManagerService],
  controllers: [],
  providers: [AccountCreateManagerService],
})
export class AccountCreateManagerModule {}
