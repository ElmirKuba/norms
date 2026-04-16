import { Module } from '@nestjs/common';
import { SessionRefreshUseCaseModule } from './refresh/refresh.use-case.module';
import { SessionReadUseCaseModule } from './read/read.use-case.module';
import { SessionDeleteUseCaseModule } from './delete/delete.use-case.module';

/** Модуль всех модулей бизнес логики уровня UseCase связанных с сессиями */
@Module({
  imports: [
    SessionRefreshUseCaseModule,
    SessionReadUseCaseModule,
    SessionDeleteUseCaseModule,
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export class SessionUseCaseModule {}
