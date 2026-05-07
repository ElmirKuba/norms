import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { SessionController } from './session.controller';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { ReadSessionListUseCase } from './use-cases/read-session-list.use-case';

/** Модуль сессий: ротация токенов, список устройств. */
@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [SessionController],
  providers: [RefreshTokenUseCase, ReadSessionListUseCase],
})
export class SessionModule {}
