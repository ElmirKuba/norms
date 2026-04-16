import { Module } from '@nestjs/common';
import { AccountAdapterModule } from 'src/adapters/account/account.adapter.module';
import { AccountUpdateManagerService } from './update.manager.service';

/** Модуль бизнес логики уровня Manager обновления данных аккаунта */
@Module({
  imports: [AccountAdapterModule],
  exports: [AccountUpdateManagerService],
  controllers: [],
  providers: [AccountUpdateManagerService],
})
export class AccountUpdateManagerModule {}
