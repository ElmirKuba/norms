import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

/** DI-токен для инстанса базы данных Drizzle. */
export const DRIZZLE_DB = 'DRIZZLE_DB';

/** Тип базы данных Drizzle со всеми схемами. */
export type DrizzleDb = NodePgDatabase<typeof schema>;

/** NestJS-модуль, создающий и предоставляющий инстанс Drizzle ORM. */
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
