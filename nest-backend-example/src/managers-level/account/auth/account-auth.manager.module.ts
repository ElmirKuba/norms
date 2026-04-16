import { Module } from '@nestjs/common';
import { AccountAdapterModule } from '../../../adapters/account/account.adapter.module';
import { AccountAuthManagerService } from './account-auth.manager.service';

/** Модуль бизнес логики уровня Manager авторизации аккаунта */
@Module({
  imports: [AccountAdapterModule],
  exports: [AccountAuthManagerService],
  controllers: [],
  providers: [AccountAuthManagerService],
})
export class AccountAuthManagerModule {}
