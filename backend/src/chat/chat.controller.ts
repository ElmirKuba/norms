import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateChatUseCase } from './use-cases/create-chat.use-case';
import { ReadChatListUseCase } from './use-cases/read-chat-list.use-case';
import { ReadOrphanPeersUseCase } from './use-cases/read-orphan-peers.use-case';
import { DeleteChatUseCase } from './use-cases/delete-chat.use-case';
import { WssConnectionStore } from '../wss/wss-connection.store';
import { CreateChatDto } from './dto/create-chat.dto';

/** Контроллер чатов. */
@Controller('chat')
export class ChatController {
  public constructor(
    private readonly _createChatUseCase: CreateChatUseCase,
    private readonly _readChatListUseCase: ReadChatListUseCase,
    private readonly _readOrphanPeersUseCase: ReadOrphanPeersUseCase,
    private readonly _deleteChatUseCase: DeleteChatUseCase,
    private readonly _store: WssConnectionStore,
  ) {}

  /**
   * Возвращает список чатов текущей сессии с данными собеседника.
   * @param user - Payload текущего JWT.
   * @returns Список чатов, новые первые.
   */
  @Get('read-list')
  @UseGuards(JwtGuard)
  public readList(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<ReadChatListUseCase['execute']> {
    return this._readChatListUseCase.execute(user.sessionId);
  }

  /**
   * Возвращает аккаунты с чатами на других устройствах, но без чатов на текущем.
   * @param user - Payload текущего JWT.
   * @returns Список осиротевших собеседников.
   */
  @Get('read-orphan-peers')
  @UseGuards(JwtGuard)
  public readOrphanPeers(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<ReadOrphanPeersUseCase['execute']> {
    return this._readOrphanPeersUseCase.execute(user.sub, user.sessionId);
  }

  /**
   * Создаёт чат между текущей сессией и выбранным устройством собеседника.
   * @param user - Payload текущего JWT.
   * @param dto - Название чата и ID сессии получателя.
   * @returns Созданный чат.
   */
  @Post('create')
  @UseGuards(JwtGuard)
  public create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateChatDto,
  ): ReturnType<CreateChatUseCase['execute']> {
    return this._createChatUseCase.execute(user.sessionId, dto.receiver_session_id, dto.name);
  }

  /**
   * Удаляет чат. Pending_messages каскадируются. Собеседник получает WSS chat_deleted.
   * @param user - Payload текущего JWT.
   * @param id - ID удаляемого чата.
   */
  @Delete('delete/:id')
  @UseGuards(JwtGuard)
  @HttpCode(204)
  public async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    const result = await this._deleteChatUseCase.execute(user.sessionId, id);
    this._store.sendToSession(result.otherSessionId, 'chat_deleted', { chat_id: result.chatId });
  }
}
