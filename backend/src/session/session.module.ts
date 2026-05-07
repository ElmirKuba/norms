import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { SessionController } from './session.controller';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';

/** Модуль сессий: ротация токенов. */
@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [SessionController],
  providers: [RefreshTokenUseCase],
})
export class SessionModule {}
