import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateAccountUseCase } from './use-cases/create-account.use-case';
import { AuthAccountUseCase } from './use-cases/auth-account.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { CreateAccountDto } from './dto/create-account.dto';
import { AuthAccountDto } from './dto/auth-account.dto';

/** Контроллер управления аккаунтом: регистрация, авторизация, выход. */
@Controller('account')
export class AccountController {
  public constructor(
    private readonly _createAccountUseCase: CreateAccountUseCase,
    private readonly _authAccountUseCase: AuthAccountUseCase,
    private readonly _logoutUseCase: LogoutUseCase,
  ) {}

  /**
   * Регистрация нового аккаунта. Потребляет инвайт-код атомарно в транзакции.
   * @param dto - Данные регистрации.
   * @returns Данные аккаунта и сессии с токенами.
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  public create(@Body() dto: CreateAccountDto): ReturnType<CreateAccountUseCase['execute']> {
    return this._createAccountUseCase.execute(dto);
  }

  /**
   * Авторизация по UIN/username и паролю. Создаёт новую сессию.
   * @param dto - Данные для входа.
   * @returns Данные аккаунта и сессии с токенами.
   */
  @Post('auth')
  public auth(@Body() dto: AuthAccountDto): ReturnType<AuthAccountUseCase['execute']> {
    return this._authAccountUseCase.execute(dto);
  }

  /**
   * Выход из текущей сессии. Удаляет запись сессии из БД.
   * @param user - Payload текущего JWT.
   */
  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    await this._logoutUseCase.execute(user.sessionId);
  }
}
