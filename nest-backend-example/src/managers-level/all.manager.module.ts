import { Module } from '@nestjs/common';
import { AccountManagerModule } from './account/account.manager.module';
import { TokensManagerModule } from './tokens/tokens.manager.module';
import { SessionManagerModule } from './session/session.manager.module';

/** Модуль всех модулей бизнес логики уровня Manager */
@Module({
  imports: [AccountManagerModule, TokensManagerModule, SessionManagerModule],
  exports: [],
  controllers: [],
  providers: [],
})
export class AllManagerModule {}
