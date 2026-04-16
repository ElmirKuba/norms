import { Module } from '@nestjs/common';
import { SessionReadUseCaseService } from './read.use-case.service';
import { AccountReadManagerModule } from '../../../managers-level/account/read/account-read.manager.module';
import { ReadSessionManagerModule } from '../../../managers-level/session/read/read-session.manager.module';

/** Модуль бизнес логики уровня UseCase чтения сессий */
@Module({
  imports: [AccountReadManagerModule, ReadSessionManagerModule],
  exports: [SessionReadUseCaseService],
  controllers: [],
  providers: [SessionReadUseCaseService],
})
export class SessionReadUseCaseModule {}
