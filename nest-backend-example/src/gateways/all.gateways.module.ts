import { Module } from '@nestjs/common';
import { SocketIOGatewayModule } from './socket.io/socket.io.gateway.module';

/** Модуль всех модулей для работы с Gateways */
@Module({
  imports: [SocketIOGatewayModule],
  exports: [],
  controllers: [],
  providers: [],
})
export class AllGatewaysModule {}
