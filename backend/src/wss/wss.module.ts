import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { WssConnectionStore } from './wss-connection.store';
import { WssGateway } from './wss.gateway';

/**
 * Глобальный WSS-модуль.
 * WssConnectionStore доступен во всех модулях без явного импорта WssModule.
 */
@Global()
@Module({
  imports: [AuthModule, PersistenceModule],
  providers: [WssConnectionStore, WssGateway],
  exports: [WssConnectionStore],
})
export class WssModule {}
