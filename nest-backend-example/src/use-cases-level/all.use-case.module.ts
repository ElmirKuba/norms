import { Module } from '@nestjs/common';
import { AccountUseCaseModule } from './account/account.use-case.module';
import { SessionUseCaseModule } from './session/session.use-case.module';

/** Модуль всех модулей бизнес логики уровня UseCase */
@Module({
  imports: [AccountUseCaseModule, SessionUseCaseModule],
  exports: [],
  controllers: [],
  providers: [],
})
export class AllUseCaseModule {}
