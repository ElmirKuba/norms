import { Module } from '@nestjs/common';
import { AccountRepository } from '../domain/ports/account.repository.port';
import { SessionRepository } from '../domain/ports/session.repository.port';
import { InviteRepository } from '../domain/ports/invite.repository.port';
import { RecoveryQuestionRepository } from '../domain/ports/recovery-question.repository.port';
import { DrizzleModule } from './drizzle.module';
import { DrizzleAccountRepository } from './repositories/account.repository';
import { DrizzleSessionRepository } from './repositories/session.repository';
import { DrizzleInviteRepository } from './repositories/invite.repository';
import { DrizzleRecoveryQuestionRepository } from './repositories/recovery-question.repository';

/** Модуль персистентности — связывает порты домена с Drizzle-реализациями. */
@Module({
  imports: [DrizzleModule],
  providers: [
    {
      provide: AccountRepository,
      useClass: DrizzleAccountRepository,
    },
    {
      provide: SessionRepository,
      useClass: DrizzleSessionRepository,
    },
    {
      provide: InviteRepository,
      useClass: DrizzleInviteRepository,
    },
    {
      provide: RecoveryQuestionRepository,
      useClass: DrizzleRecoveryQuestionRepository,
    },
  ],
  exports: [AccountRepository, SessionRepository, InviteRepository, RecoveryQuestionRepository, DrizzleModule],
})
export class PersistenceModule {}
