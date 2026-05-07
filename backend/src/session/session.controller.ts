import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { ReadSessionListUseCase } from './use-cases/read-session-list.use-case';
import { DeleteSessionUseCase } from './use-cases/delete-session.use-case';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/** Контроллер управления сессиями: ротация токенов, список устройств, кик. */
@Controller('session')
export class SessionController {
  public constructor(
    private readonly _refreshTokenUseCase: RefreshTokenUseCase,
    private readonly _readSessionListUseCase: ReadSessionListUseCase,
    private readonly _deleteSessionUseCase: DeleteSessionUseCase,
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

  /**
   * Удаляет сессию по ID. Нельзя удалить сессию другого аккаунта.
   * @param user - Payload текущего JWT.
   * @param id - ID сессии для удаления.
   * @returns Промис без значения.
   */
  @Delete('delete/:id')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public delete(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): ReturnType<DeleteSessionUseCase['execute']> {
    return this._deleteSessionUseCase.execute(user.sub, id);
  }
}
