import { Module } from '@nestjs/common';
import { AccountReadManagerModule } from './read/account-read.manager.module';
import { AccountUpdateManagerModule } from './update/update.manager.module';
import { AccountCreateManagerModule } from './create/account-create.manager.module';
import { AccountAuthManagerModule } from './auth/account-auth.manager.module';

/** Модуль всех модулей бизнес логики уровня Manager связанных с аккаунтами */
@Module({
  imports: [
    AccountCreateManagerModule,
    AccountAuthManagerModule,
    AccountReadManagerModule,
    AccountUpdateManagerModule,
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export class AccountManagerModule {}
