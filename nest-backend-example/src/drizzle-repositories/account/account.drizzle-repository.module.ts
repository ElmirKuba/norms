import { Module } from '@nestjs/common';
import { AccountDrizzleRepositoryService } from './account.drizzle-repository.service';

/** Модуль репозитория для работы с данными аккаунта через схему аккаунта */
@Module({
  imports: [],
  exports: [AccountDrizzleRepositoryService],
  controllers: [],
  providers: [AccountDrizzleRepositoryService],
})
export class AccountDrizzleRepositoryModule {}
