import { Module } from '@nestjs/common';
import { SessionDrizzleRepositoryService } from './session.drizzle-repository.service';

/** Модуль репозитория для работы с данными сессий через схему сессий */
@Module({
  imports: [],
  exports: [SessionDrizzleRepositoryService],
  controllers: [],
  providers: [SessionDrizzleRepositoryService],
})
export class SessionDrizzleRepositoryModule {}
