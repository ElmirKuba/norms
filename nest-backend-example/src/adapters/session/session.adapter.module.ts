import { Module } from '@nestjs/common';
import { SessionAdapterService } from './session.adapter.service';
import { SessionDrizzleRepositoryModule } from '../../drizzle-repositories/session/session.drizzle-repository.module';

/** Модуль-адаптер для работы с репозиторием данных сессий */
@Module({
  imports: [SessionDrizzleRepositoryModule],
  exports: [SessionAdapterService],
  controllers: [],
  providers: [SessionAdapterService],
})
export class SessionAdapterModule {}
