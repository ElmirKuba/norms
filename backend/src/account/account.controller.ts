import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
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
import { ReadAccountUseCase } from './use-cases/read-account.use-case';
import { CreateAccountDto } from './dto/create-account.dto';
import { AuthAccountDto } from './dto/auth-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateAccountUseCase } from './use-cases/update-account.use-case';

/** Контроллер управления аккаунтом: регистрация, авторизация, выход, чтение, обновление. */
@Controller('account')
export class AccountController {
  public constructor(
    private readonly _createAccountUseCase: CreateAccountUseCase,
    private readonly _authAccountUseCase: AuthAccountUseCase,
    private readonly _logoutUseCase: LogoutUseCase,
    private readonly _readAccountUseCase: ReadAccountUseCase,
    private readonly _updateAccountUseCase: UpdateAccountUseCase,
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

  /**
   * Чтение данных аккаунта. Без параметров — свой профиль. По ?id= или ?uin= — чужой.
   * @param user - Payload текущего JWT.
   * @param id - ID аккаунта (опционально).
   * @param uin - UIN аккаунта (опционально).
   * @returns Данные аккаунта.
   */
  @Get('read')
  @UseGuards(JwtGuard)
  public read(
    @CurrentUser() user: JwtPayload,
    @Query('id') id?: string,
    @Query('uin') uin?: string,
  ): ReturnType<ReadAccountUseCase['execute']> {
    const q = { ...(id !== undefined && { id }), ...(uin !== undefined && { uin }) };
    return this._readAccountUseCase.execute(user.sub, q);
  }

  /**
   * Смена пароля текущего аккаунта.
   * @param user - Payload текущего JWT.
   * @param dto - Текущий и новый пароль.
   */
  @Patch('update')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public async update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateAccountDto): Promise<void> {
    await this._updateAccountUseCase.execute(user.sub, dto);
  }
}
