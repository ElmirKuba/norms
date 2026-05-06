import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from './persistence/persistence.module';

/** Корневой модуль приложения. Импортирует все фичевые модули. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PersistenceModule,
  ],
})
export class AppModule {}
