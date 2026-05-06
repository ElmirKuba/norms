import { Module } from '@nestjs/common';
import { AccountRepository } from '../domain/ports/account.repository.port';
import { DrizzleModule } from './drizzle.module';
import { DrizzleAccountRepository } from './repositories/account.repository';

/**
 * Persistence module — wires domain ports to their Drizzle implementations.
 * Import this module wherever repository ports are needed.
 */
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
