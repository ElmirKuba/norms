import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

/** DI token for the Drizzle database instance. */
export const DRIZZLE_DB = 'DRIZZLE_DB';

/** Drizzle database type with full schema awareness. */
export type DrizzleDb = NodePgDatabase<typeof schema>;

/** NestJS module that creates and provides the Drizzle ORM database instance. */
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DrizzleDb => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        const pool = new Pool({ connectionString: url });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DrizzleModule {}
