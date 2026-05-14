import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { ChatController } from './chat.controller';
import { CreateChatUseCase } from './use-cases/create-chat.use-case';
import { ReadChatListUseCase } from './use-cases/read-chat-list.use-case';
import { ReadOrphanPeersUseCase } from './use-cases/read-orphan-peers.use-case';

/** Модуль чатов. */
@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [ChatController],
  providers: [CreateChatUseCase, ReadChatListUseCase, ReadOrphanPeersUseCase],
})
export class ChatModule {}
