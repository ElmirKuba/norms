import { Module } from '@nestjs/common';
import { DrizzleMySqlModule } from '@knaadh/nestjs-drizzle-mysql2';
import { SystemController } from './controllers/system.controller';
import { SystemService } from './services/system.service';
import { accountSchema } from './orm-schemas/account.schema';
import { sessionSchema } from './orm-schemas/session.schema';
import { accountsRelations } from './orm-relations/account.relation';
import { sessionRelations } from './orm-relations/session.relation';

/** Основной системный модуль приложения NestJS */
@Module({
  imports: [
    DrizzleMySqlModule.register({
      tag: 'DRIZZLE_DB_MYSQL_ONE',
      mysql: {
        connection: 'pool',
        config: {
          host: process.env['MYSQL_HOST_AND_NAME_DATABASE'],
          port: Number(process.env['MYSQL_PORT']),
          user: process.env['MYSQL_USER'],
          password: process.env['MYSQL_PASSWORD'],
          database: process.env['MYSQL_HOST_AND_NAME_DATABASE'],
          charset: 'utf8',
        },
      },
      config: {
        schema: {
          // Схемы
          accountSchema,
          sessionSchema,
          // Связи
          accountsRelations,
          sessionRelations,
        },
        mode: 'default',
        casing: 'camelCase',
      },
    }),
  ],
  exports: [],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
