import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from './persistence/persistence.module';
import { AccountDemoUseCase } from './application/account-demo.use-case';

/** Корневой модуль приложения. Импортирует все фичевые модули. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PersistenceModule,
  ],
  providers: [AccountDemoUseCase],
})
export class AppModule {}
