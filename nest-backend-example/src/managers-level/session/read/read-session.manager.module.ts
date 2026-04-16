import { Module } from '@nestjs/common';
import { SessionAdapterModule } from '../../../adapters/session/session.adapter.module';
import { ReadSessionManagerService } from './read-session.manager.service';

/** Модуль бизнес логики уровня manager чтения сессии */
@Module({
  imports: [SessionAdapterModule],
  exports: [ReadSessionManagerService],
  controllers: [],
  providers: [ReadSessionManagerService],
})
export class ReadSessionManagerModule {}
