import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccountToInputDataDto } from '../../../dtos/input/account/account-to-input-data.dto';
import { ApiResult } from '../../../interfaces/api/api-interfaces';
import { IAccountWithoutPassword } from '../../../interfaces/full/account/account-without-password.interface';
import { AccountAuthUseCaseService } from '../../../use-cases-level/account/auth/account-auth.use-case.service';
import { IResult, UAParser } from 'ua-parser-js';
import { IAccountAuthSuccess } from '../../../interfaces/full/account/account-auth-success.interface';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResultDto } from '../../../dtos/output/api/api-result.dto';

/** Контроллер модуля REST-API связанного с функционалом авторизации аккаунта */
@ApiTags('Авторизация аккаунта')
@Controller('account')
export class ApiAuthAccountController {
  /**
   * Конструктор контроллера системы
   * @param {AccountAuthUseCaseService} accountAuthUseCaseService - Экземпляр сервиса модуля бизнес логики уровня UseCase авторизации аккаунта
   */
  constructor(private accountAuthUseCaseService: AccountAuthUseCaseService) {}

  /**
   * REST-API Post эндпоинт авторизации аккаунта
   * @param {Request} req - Технические данные идущие вместе с запросом
   * @param {Response} res - Технические данные идущие вместе с ответом
   * @param {AccountToInputDataDto} accountToInputDataDto - Провалидированные DTO`s данные аккаунта для авторизации
   * @returns {Promise<ApiResult<IAccountAuthSuccess | null>>} - Результат работы REST API Post метода авторизации
   * @public
   */
  @Post('auth')
  @ApiOperation({
    summary: 'Этот метод отправляет запрос на авторизацию аккаунта',
    description:
      'При отсутствии ошибок возвращает результат авторизации аккаунта',
  })
  @ApiOkResponse({
    description: 'Аккаунт успешно авторизован',
    type: ApiResultDto<IAccountAuthSuccess | null>,
  })
  @ApiNotFoundResponse({
    description: 'Аккаунт не найден',
    type: ApiResultDto,
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  public async auth(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() accountToInputDataDto: AccountToInputDataDto,
  ): Promise<ApiResult<IAccountAuthSuccess | null>> {
    /** IP вызывающего REST API */
    let userIp =
      req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;

    if (typeof userIp === 'string' && userIp.startsWith('::ffff:')) {
      userIp = userIp.replace('::ffff:', '');
    }

    /** User-Agent */
    const userAgent = req.headers['user-agent'] || '';
    /** Парсер User-Agent */
    const parser = new UAParser(userAgent);
    /** Распарсенные данные user-agent пользователя */
    const userAgentData: IResult = parser.getResult();

    /** Результат авторизации аккаунта */
    const resultAuth = await this.accountAuthUseCaseService.auth({
      dataForAuthCorrectAccount: accountToInputDataDto,
      userAgentData,
      userIp,
    });

    let returned: ApiResult<IAccountAuthSuccess | null> = {
      error: resultAuth.error,
      successMessages: resultAuth.successMessages,
      errorMessages: resultAuth.errorMessages,
      data: null,
    };

    if (resultAuth.error || !resultAuth.data) {
      // TODO: ElmirKuba 2025-08-20: Разобраться UNAUTHORIZED тут или ветвление как в апи создания пароля
      throw new HttpException(returned, HttpStatus.UNAUTHORIZED);
    }

    const { accessToken, refreshToken } = resultAuth.data.tokens;

    returned = {
      ...returned,
      data: {
        autharizationAccount: resultAuth.data
          .account as IAccountWithoutPassword,
        accessToken,
      },
    };

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 20,
      path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30,
      path: '/',
    });

    return returned;
  }
}
