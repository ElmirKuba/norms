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
import type { Response } from 'express';
import { ApiResult } from '../../../interfaces/api/api-interfaces';
import { Auth } from '../../../utility-level/decorators/auth.decorator';
import type { ReqWithCookies } from '../../../interfaces/systems/req-with-cookies.interface';
import { AccountLogoutUseCaseService } from '../../../use-cases-level/account/logout/logout.use-case.service';
import { ApiResultDto } from '../../../dtos/output/api/api-result.dto';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/** Контроллер модуля REST-API связанного с функционалом выхода из аккаунта */
@ApiTags('Выход из аккаунта')
@Controller('account')
export class ApiLogoutAccountController {
  /**
   * Конструктор контроллера системы
   * @param {AccountLogoutUseCaseService} accountLogoutUseCaseService - Экземпляр сервиса модуля бизнес логики уровня UseCase выхода из аккаунта
   **/
  constructor(
    private accountLogoutUseCaseService: AccountLogoutUseCaseService,
  ) {}

  /**
   * Метод выхода из аккаунта
   * @param {ReqWithCookies} req - Попутные данные при запросе на данное REST API
   * @param {Response} res - Попутные данные при ответе от данного REST API
   * @returns {Promise<ApiResult<null>>} - Результат работы REST-API Post эндпоинта авторизации аккаунта
   * @public
   */
  @Post('logout')
  @ApiOperation({
    summary:
      'Этот метод отправляет запрос на выход из аккаунта и завершение сессии работы с ним',
    description:
      'При отсутствии ошибок возвращает результат выхода из аккаунта',
  })
  @ApiOkResponse({
    description: 'Выход из аккаунта успешно произведен',
    type: ApiResultDto<null>,
  })
  @ApiUnauthorizedResponse({
    description:
      'Вы не авторизованы и у вас нет прав использовать данный функционал',
  })
  @Auth({
    defendType: 'api',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  public async logout(
    @Req() req: ReqWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResult<null>> {
    /** Токен обновления пары токенов текущей сесиии */
    const incomingRefreshToken = req.cookies?.refreshToken;

    if (!incomingRefreshToken) {
      throw new UnauthorizedException(
        'Вашему аккаунту не требуется выполнять выход, он не авторизован!',
      );
    }

    /** Результат работы сервиса бизнес логики уровня Use-Case выхода из аккаунта */
    const resultLogout =
      await this.accountLogoutUseCaseService.logout(incomingRefreshToken);

    /** Формируем данные для отправки на Frontend */
    const result: ApiResult<null> = {
      error: resultLogout.error,
      errorMessages: resultLogout.errorMessages,
      successMessages: resultLogout.successMessages,
      data: resultLogout.data,
    };

    if (resultLogout.error) {
      // TODO: ElmirKuba 2025-08-20: Разобраться UNAUTHORIZED тут или ветвление как в апи создания пароля
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return result;
  }
}
