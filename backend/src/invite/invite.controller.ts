import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CheckInviteUseCase } from './use-cases/check-invite.use-case';
import { CheckInviteDto } from './dto/check-invite.dto';

/** Контроллер инвайтов: проверка кода приглашения. */
@Controller('invite')
export class InviteController {
  public constructor(private readonly _checkInviteUseCase: CheckInviteUseCase) {}

  /**
   * Проверяет валидность инвайт-кода. Код не потребляется.
   * @param dto - Код приглашения.
   * @param req - HTTP-запрос (для извлечения IP при rate-limiting).
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
}
