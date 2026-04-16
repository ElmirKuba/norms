import { Module } from '@nestjs/common';
import { AccountDrizzleRepositoryModule } from './account/account.drizzle-repository.module';
import { SessionDrizzleRepositoryModule } from './session/session.drizzle-repository.module';

/** Модуль всех модулей-репозиториев для работы данными через схемы */
@Module({
  imports: [AccountDrizzleRepositoryModule, SessionDrizzleRepositoryModule],
  exports: [],
  controllers: [],
  providers: [],
})
export class AllDrizzleRepositoriesModule {}
