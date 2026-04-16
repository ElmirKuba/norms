import { Module } from '@nestjs/common';
import { AccountLogoutUseCaseService } from './logout.use-case.service';
import { ReadSessionManagerModule } from '../../../managers-level/session/read/read-session.manager.module';
import { DeleteSessionManagerModule } from '../../../managers-level/session/delete/delete.manager.module';

/** Модуль бизнес логики уровня UseCase выхода из аккаунта */
@Module({
  imports: [ReadSessionManagerModule, DeleteSessionManagerModule],
  exports: [AccountLogoutUseCaseService],
  controllers: [],
  providers: [AccountLogoutUseCaseService],
})
export class AccountLogoutUseCaseModule {}
