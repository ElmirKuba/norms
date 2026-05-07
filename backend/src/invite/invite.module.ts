import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';
import { InviteController } from './invite.controller';
import { CheckInviteUseCase } from './use-cases/check-invite.use-case';
import { CreateInviteUseCase } from './use-cases/create-invite.use-case';
import { RevokeInviteUseCase } from './use-cases/revoke-invite.use-case';
import { ReadInviteListUseCase } from './use-cases/read-invite-list.use-case';
import { ReadReferralsUseCase } from './use-cases/read-referrals.use-case';

/** Модуль инвайтов: проверка, создание, отзыв, список и реферальная информация. */
@Module({
  imports: [AuthModule, PersistenceModule, RedisModule],
  controllers: [InviteController],
  providers: [CheckInviteUseCase, CreateInviteUseCase, RevokeInviteUseCase, ReadInviteListUseCase, ReadReferralsUseCase],
})
export class InviteModule {}
