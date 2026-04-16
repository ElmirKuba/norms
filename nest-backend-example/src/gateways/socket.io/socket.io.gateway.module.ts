import { Module } from '@nestjs/common';
import { SocketIOGatewayService } from './socket.io.gateway.service';
import { GuardsUtilityModule } from '../../utility-level/guards/guards.utility.module';

/** Модуль Gateway Socket.IO непосредственно */
@Module({
  imports: [GuardsUtilityModule],
  exports: [],
  controllers: [],
  providers: [SocketIOGatewayService],
})
export class SocketIOGatewayModule {}
