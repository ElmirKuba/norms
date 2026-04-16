import { Module } from '@nestjs/common';
import { SessionRefreshUseCaseService } from './refresh.use-case.service';
import { ReadSessionManagerModule } from '../../../managers-level/session/read/read-session.manager.module';
import { ValidateTokensManagerModule } from '../../../managers-level/tokens/validate-tokens/validate-tokens.manager.module';
import { DeleteSessionManagerModule } from '../../../managers-level/session/delete/delete.manager.module';
import { AccountReadManagerModule } from '../../../managers-level/account/read/account-read.manager.module';
import { GenerateTokensManagerModule } from '../../../managers-level/tokens/generate-tokens/generate-tokens.manager.module';
import { CreateOrUpdateSessionManagerModule } from '../../../managers-level/session/create-or-update/create-or-update.manager.module';

/** Модуль бизнес логики уровня UseCase обновления сессии */
@Module({
  imports: [
    ReadSessionManagerModule,
    ValidateTokensManagerModule,
    DeleteSessionManagerModule,
    AccountReadManagerModule,
    GenerateTokensManagerModule,
    CreateOrUpdateSessionManagerModule,
  ],
  exports: [SessionRefreshUseCaseService],
  controllers: [],
  providers: [SessionRefreshUseCaseService],
})
export class SessionRefreshUseCaseModule {}
