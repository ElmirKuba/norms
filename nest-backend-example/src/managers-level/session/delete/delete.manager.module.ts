import { Module } from '@nestjs/common';
import { DeleteSessionManagerService } from './delete.manager.service';
import { SessionAdapterModule } from '../../../adapters/session/session.adapter.module';

/** Модуль уровня manager бизнес логики удаления сессии */
@Module({
  imports: [SessionAdapterModule],
  exports: [DeleteSessionManagerService],
  controllers: [],
  providers: [DeleteSessionManagerService],
})
export class DeleteSessionManagerModule {}
