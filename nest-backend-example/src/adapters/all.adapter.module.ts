import { Module } from '@nestjs/common';
import { AccountAdapterModule } from './account/account.adapter.module';
import { SessionAdapterModule } from './session/session.adapter.module';

/** Модуль всех модулей-адаптеров для работы с репозиториями данных */
@Module({
  imports: [AccountAdapterModule, SessionAdapterModule],
  exports: [],
  controllers: [],
  providers: [],
})
export class AllAdaptersModule {}
