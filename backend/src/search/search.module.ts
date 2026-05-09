import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { SearchController } from './search.controller';
import { SearchUseCase } from './use-cases/search.use-case';

/** Модуль глобального поиска аккаунтов по UIN и username. */
@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [SearchController],
  providers: [SearchUseCase],
})
export class SearchModule {}
