import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { ChatController } from './chat.controller';
import { CreateChatUseCase } from './use-cases/create-chat.use-case';
import { ReadChatListUseCase } from './use-cases/read-chat-list.use-case';
import { ReadOrphanPeersUseCase } from './use-cases/read-orphan-peers.use-case';
import { DeleteChatUseCase } from './use-cases/delete-chat.use-case';
import { SubmitChatKeyUseCase } from './use-cases/submit-chat-key.use-case';

/** Модуль чатов. */
@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [ChatController],
  providers: [CreateChatUseCase, ReadChatListUseCase, ReadOrphanPeersUseCase, DeleteChatUseCase, SubmitChatKeyUseCase],
})
export class ChatModule {}
