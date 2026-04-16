import { Module } from '@nestjs/common';
import { CreateOrUpdateSessionManagerService } from './create-or-update.manager.service';
import { SessionAdapterModule } from '../../../adapters/session/session.adapter.module';

/** Модуль бизнес логики уровня Manager связанных с созданием и/или обновления сессии авторизованного аккаунта */
@Module({
  imports: [SessionAdapterModule],
  exports: [CreateOrUpdateSessionManagerService],
  controllers: [],
  providers: [CreateOrUpdateSessionManagerService],
})
export class CreateOrUpdateSessionManagerModule {}
