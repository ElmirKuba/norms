import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { ChatController } from './chat.controller';
import { CreateChatUseCase } from './use-cases/create-chat.use-case';

/** Модуль чатов. */
@Module({
  imports: [AuthModule, PersistenceModule],
  controllers: [ChatController],
  providers: [CreateChatUseCase],
})
export class ChatModule {}
