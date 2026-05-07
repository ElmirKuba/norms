import { Controller, Post, Body } from '@nestjs/common';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/** Контроллер управления сессиями: ротация токенов. */
@Controller('session')
export class SessionController {
  public constructor(private readonly _refreshTokenUseCase: RefreshTokenUseCase) {}

  /**
   * Ротирует refresh-токен и возвращает новую пару токенов.
   * @param dto - Текущий refresh-токен.
   * @returns Новые access и refresh токены.
   */
  @Post('refresh')
  public refresh(@Body() dto: RefreshTokenDto): ReturnType<RefreshTokenUseCase['execute']> {
    return this._refreshTokenUseCase.execute(dto.refresh_token);
  }
}
