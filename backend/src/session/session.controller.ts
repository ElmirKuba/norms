import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { ReadSessionListUseCase } from './use-cases/read-session-list.use-case';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/** Контроллер управления сессиями: ротация токенов, список устройств. */
@Controller('session')
export class SessionController {
  public constructor(
    private readonly _refreshTokenUseCase: RefreshTokenUseCase,
    private readonly _readSessionListUseCase: ReadSessionListUseCase,
  ) {}

  /**
   * Ротирует refresh-токен и возвращает новую пару токенов.
   * @param dto - Текущий refresh-токен.
   * @returns Новые access и refresh токены.
   */
  @Post('refresh')
  public refresh(@Body() dto: RefreshTokenDto): ReturnType<RefreshTokenUseCase['execute']> {
    return this._refreshTokenUseCase.execute(dto.refresh_token);
  }

  /**
   * Возвращает список всех активных сессий аккаунта.
   * @param user - Payload текущего JWT.
   * @returns Список сессий с флагом is_current.
   */
  @Get('read-list')
  @UseGuards(JwtGuard)
  public readList(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<ReadSessionListUseCase['execute']> {
    return this._readSessionListUseCase.execute(user.sub, user.sessionId);
  }
}
