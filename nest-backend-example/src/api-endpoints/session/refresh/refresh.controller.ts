import {
  Controller,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionRefreshUseCaseService } from '../../../use-cases-level/session/refresh/refresh.use-case.service';
import type { Response } from 'express';
import { ApiResult } from '../../../interfaces/api/api-interfaces';
import type { ReqWithCookies } from '../../../interfaces/systems/req-with-cookies.interface';
import { UAParser } from 'ua-parser-js';
import { IAccountWithoutPassword } from '../../../interfaces/full/account/account-without-password.interface';
import { IAccountAuthSuccess } from '../../../interfaces/full/account/account-auth-success.interface';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiResultDto } from '../../../dtos/output/api/api-result.dto';

/** Контроллер REST-API связанного с функционалом обновления сессии */
@ApiTags('Обновить сессию')
@Controller('session')
export class ApiRefreshSessionController {
  /**
   * Конструктор контроллера системы
   * @param {SessionRefreshUseCaseService} sessionRefreshUseCaseService - Экземпляр сервиса модуля бизнес логики уровня UseCase обновления сессии
   */
  constructor(
    private sessionRefreshUseCaseService: SessionRefreshUseCaseService,
  ) {}

  /**
   * Метод обновления сессии
   * @param {ReqWithCookies} req - Попутные данные при запросе на данное REST API
   * @param {Response} res - Попутные данные при ответе от данного REST API
   * @returns {Promise<ApiResult<IAccountAuthSuccess | null>>} - Результат работы REST-API Post эндпоинта авторизации аккаунта
   * @public
   */
  @Post('refresh')
  @ApiOperation({
    summary:
      'Этот метод отправляет запрос на обновление сессии авторизации аккаунта',
    description: 'При отсутствии ошибок возвращает результат обновления сессии',
  })
  @ApiOkResponse({
    description: 'Аккаунт успешно обновлен',
    type: ApiResultDto<IAccountAuthSuccess | null>,
  })
  @ApiUnauthorizedResponse({
    description:
      'Вы не авторизованы и у вас нет прав использовать данный функционал',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  public async refresh(
    @Req() req: ReqWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResult<IAccountAuthSuccess | null>> {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
      throw new UnauthorizedException(
        'Вашему аккаунту не требуется выполнять обновление сессии, он не авторизован!',
      );
    }

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
    const userAgentData = parser.getResult();

    const resultRefreshSession =
      await this.sessionRefreshUseCaseService.refresh(
        incomingRefreshToken,
        userAgentData,
        userIp as string,
      );

    let returned: ApiResult<IAccountAuthSuccess | null> = {
      error: resultRefreshSession.error,
      successMessages: resultRefreshSession.successMessages,
      errorMessages: resultRefreshSession.errorMessages,
      data: null,
    };

    if (resultRefreshSession.error || !resultRefreshSession.data) {
      // TODO: ElmirKuba 2025-08-20: Разобраться UNAUTHORIZED тут или ветвление как в апи создания пароля
      throw new HttpException(returned, HttpStatus.UNAUTHORIZED);
    }

    const { accessToken, refreshToken } = resultRefreshSession.data.tokens;

    returned = {
      ...returned,
      data: {
        autharizationAccount: resultRefreshSession.data
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
