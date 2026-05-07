import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';
import { InviteController } from './invite.controller';
import { CheckInviteUseCase } from './use-cases/check-invite.use-case';

/** Модуль инвайтов: проверка и создание кодов приглашения. */
@Module({
  imports: [PersistenceModule, RedisModule],
  controllers: [InviteController],
  providers: [CheckInviteUseCase],
})
export class InviteModule {}
