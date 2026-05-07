import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { ReadUinStatusUseCase } from './use-cases/read-uin-status.use-case';

/** Контроллер UIN: статус генерации для поллинга (альтернатива WSS-событию uin_assigned). */
@Controller('uin')
export class UinController {
  public constructor(private readonly _readUinStatusUseCase: ReadUinStatusUseCase) {}

  /**
   * Возвращает статус UIN текущего аккаунта.
   * @param user - Payload текущего JWT.
   * @returns Статус и значение UIN.
   */
  @Get('read-status')
  @UseGuards(JwtGuard)
  public readStatus(@CurrentUser() user: JwtPayload): ReturnType<ReadUinStatusUseCase['execute']> {
    return this._readUinStatusUseCase.execute(user.sub);
  }
}
