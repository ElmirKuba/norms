import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';
import { UinModule } from '../uin/uin.module';
import { AccountController } from './account.controller';
import { CreateAccountUseCase } from './use-cases/create-account.use-case';
import { AuthAccountUseCase } from './use-cases/auth-account.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { ReadAccountUseCase } from './use-cases/read-account.use-case';

/** Модуль аккаунта: регистрация, авторизация, выход. */
@Module({
  imports: [AuthModule, PersistenceModule, RedisModule, UinModule],
  controllers: [AccountController],
  providers: [CreateAccountUseCase, AuthAccountUseCase, LogoutUseCase, ReadAccountUseCase],
})
export class AccountModule {}
