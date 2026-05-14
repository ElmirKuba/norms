import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { WssConnectionStore } from './wss-connection.store';
import { WssGateway } from './wss.gateway';
import { SendMessageUseCase } from '../chat/use-cases/send-message.use-case';
import { MessageDeliveredUseCase } from '../chat/use-cases/message-delivered.use-case';
import { MessageReadUseCase } from '../chat/use-cases/message-read.use-case';

/**
 * Глобальный WSS-модуль.
 * WssConnectionStore доступен во всех модулях без явного импорта WssModule.
 */
@Global()
@Module({
  imports: [AuthModule, PersistenceModule],
  providers: [WssConnectionStore, WssGateway, SendMessageUseCase, MessageDeliveredUseCase, MessageReadUseCase],
  exports: [WssConnectionStore],
})
export class WssModule {}
