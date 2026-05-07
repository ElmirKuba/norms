import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from './persistence/persistence.module';
import { AccountModule } from './account/account.module';
import { SessionModule } from './session/session.module';
import { InviteModule } from './invite/invite.module';

/** Корневой модуль приложения. Импортирует все фичевые модули. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PersistenceModule,
    AccountModule,
    SessionModule,
    InviteModule,
  ],
})
export class AppModule {}
