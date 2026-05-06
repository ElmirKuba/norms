import { Module } from '@nestjs/common';
import { AccountRepository } from '../domain/ports/account.repository.port';
import { DrizzleModule } from './drizzle.module';
import { DrizzleAccountRepository } from './repositories/account.repository';

/** Модуль персистентности — связывает порты домена с Drizzle-реализациями. */
@Module({
  imports: [DrizzleModule],
  providers: [
    {
      provide: AccountRepository,
      useClass: DrizzleAccountRepository,
    },
  ],
  exports: [AccountRepository],
})
export class PersistenceModule {}
