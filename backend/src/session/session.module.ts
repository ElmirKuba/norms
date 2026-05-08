import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { SessionController } from './session.controller';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { ReadSessionListUseCase } from './use-cases/read-session-list.use-case';
import { DeleteSessionUseCase } from './use-cases/delete-session.use-case';
import { ClearOtherSessionsUseCase } from './use-cases/clear-other-sessions.use-case';

/** Модуль сессий: ротация токенов, список устройств, кик. */
@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [SessionController],
  providers: [RefreshTokenUseCase, ReadSessionListUseCase, DeleteSessionUseCase, ClearOtherSessionsUseCase],
})
export class SessionModule {}
