import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateChatUseCase } from './use-cases/create-chat.use-case';
import { CreateChatDto } from './dto/create-chat.dto';

/** Контроллер чатов. */
@Controller('chat')
export class ChatController {
  public constructor(
    private readonly _createChatUseCase: CreateChatUseCase,
  ) {}

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
}
