import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PersistenceModule } from './persistence/persistence.module';
import { AccountModule } from './account/account.module';
import { SessionModule } from './session/session.module';
import { InviteModule } from './invite/invite.module';
import { UinModule } from './uin/uin.module';
import { AppConfigModule } from './config/app-config.module';

/** Конфигурация BullMQ Redis-подключения. */
interface BullRedisConfig {
  /** Хост Redis. */
  readonly host: string;
  /** Порт Redis. */
  readonly port: number;
}

/** Конфигурация корневого BullModule. */
interface BullRootConfig {
  /** Параметры подключения к Redis. */
  readonly connection: BullRedisConfig;
}

/** Корневой модуль приложения. Импортирует все фичевые модули. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): BullRootConfig => {
        const rawUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const parsed = new URL(rawUrl);
        return {
          connection: {
            host: parsed.hostname,
            port: parsed.port.length > 0 ? parseInt(parsed.port, 10) : 6379,
          },
        };
      },
    }),
    PersistenceModule,
    AccountModule,
    SessionModule,
    InviteModule,
    UinModule,
    AppConfigModule,
  ],
})
export class AppModule {}
