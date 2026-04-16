import { Module } from '@nestjs/common';
import { AccountAdapterService } from './account.adapter.service';
import { AccountDrizzleRepositoryModule } from '../../drizzle-repositories/account/account.drizzle-repository.module';

/** Модуль-адаптер для работы с репозиторием данных аккаунтов */
@Module({
  imports: [AccountDrizzleRepositoryModule],
  exports: [AccountAdapterService],
  controllers: [],
  providers: [AccountAdapterService],
})
export class AccountAdapterModule {}
