import { Controller, Post, Get, Delete, Body, Req, Param, UseGuards, HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CheckInviteUseCase } from './use-cases/check-invite.use-case';
import { CreateInviteUseCase } from './use-cases/create-invite.use-case';
import { RevokeInviteUseCase } from './use-cases/revoke-invite.use-case';
import { ReadInviteListUseCase } from './use-cases/read-invite-list.use-case';
import { CheckInviteDto } from './dto/check-invite.dto';

/** Контроллер инвайтов. */
@Controller('invite')
export class InviteController {
  public constructor(
    private readonly _checkInviteUseCase: CheckInviteUseCase,
    private readonly _createInviteUseCase: CreateInviteUseCase,
    private readonly _revokeInviteUseCase: RevokeInviteUseCase,
    private readonly _readInviteListUseCase: ReadInviteListUseCase,
  ) {}

  /**
   * Проверяет валидность инвайт-кода без потребления.
   * @param dto - Код приглашения.
   * @param req - HTTP-запрос (для rate-limiting по IP).
   * @returns expires_at кода в ISO-8601 формате.
   */
  @Post('check')
  public check(
    @Body() dto: CheckInviteDto,
    @Req() req: Request,
  ): ReturnType<CheckInviteUseCase['execute']> {
    const ip = req.ip ?? 'unknown';
    return this._checkInviteUseCase.execute(dto.code, ip);
  }

  /**
   * Создаёт новый инвайт-код. TTL определяется сервером (INVITE_TTL_DAYS).
   * @param user - Payload текущего JWT.
   * @returns Данные созданного инвайта.
   */
  @Post('create')
  @UseGuards(JwtGuard)
  public create(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<CreateInviteUseCase['execute']> {
    return this._createInviteUseCase.execute(user.sub);
  }

  /**
   * Возвращает список активных инвайтов текущего аккаунта.
   * @param user - Payload текущего JWT.
   * @returns Массив активных инвайтов.
   */
  @Get('read-list')
  @UseGuards(JwtGuard)
  public readList(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<ReadInviteListUseCase['execute']> {
    return this._readInviteListUseCase.execute(user.sub);
  }

  /**
   * Отзывает инвайт-код и возвращает +1 к лимиту.
   * @param id - ID инвайта.
   * @param user - Payload текущего JWT.
   */
  /**
   * Отзывает инвайт-код и возвращает +1 к лимиту.
   * @param id - ID инвайта.
   * @param user - Payload текущего JWT.
   * @returns Промис без значения (204 No Content).
   */
  @Delete('revoke/:id')
  @UseGuards(JwtGuard)
  @HttpCode(204)
  public revoke(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<RevokeInviteUseCase['execute']> {
    return this._revokeInviteUseCase.execute(id, user.sub);
  }
}
