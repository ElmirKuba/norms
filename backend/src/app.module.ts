import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from './persistence/persistence.module';
import { AccountDemoUseCase } from './application/account-demo.use-case';

/** Root application module. Imports all feature modules. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PersistenceModule,
  ],
  providers: [AccountDemoUseCase],
})
export class AppModule {}
