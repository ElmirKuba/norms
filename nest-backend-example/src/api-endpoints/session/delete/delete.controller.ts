import {
  Controller,
  Delete,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Auth } from '../../../utility-level/decorators/auth.decorator';
import type { ReqWithCookies } from '../../../interfaces/systems/req-with-cookies.interface';
import { SessionDeleteUseCaseService } from '../../../use-cases-level/session/delete/delete.use-case.service';
import { ISessionFull } from '../../../interfaces/full/session/session-full.interface';
import { ApiResult } from '../../../interfaces/api/api-interfaces';
import { EndOfSessions } from '../../../interfaces/systems/manager-result.interface';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResultDto } from '../../../dtos/output/api/api-result.dto';

/** Контроллер модуля REST-API связанного с функционалом удаления других своих сессий */
@ApiTags('Методы удаления сессиий')
@Controller('session')
export class ApiDeleteSessionsController {
  /**
   * Конструктор контроллера системы
   * @param {SessionDeleteUseCaseService} sessionDeleteUseCaseService - Сервис модуля бизнес логики уровня UseCase удаления сессий
   **/
  constructor(
    private sessionDeleteUseCaseService: SessionDeleteUseCaseService,
  ) {}

  /**
   * Метод удаления своей сесии по его идентификатору
   * @param {ReqWithCookies} req - Попутные данные при запросе на данное REST API
   * @param {string} sessionIdForDeleted - Идентификатор сессии для удаления из Query-param
   * @returns {Promise<ApiResult<ISessionFull | null>>} - Результат удаления своей сессии зная ее ID + данные самой удаленной сессии в случае успеха
   * @public
   */
  @Delete('delete')
  @ApiOperation({
    summary:
      'Этот метод отправляет запрос на завершение определенной сессии (кого-то выкинет из аккаунта)',
    description: 'При отсутствии ошибок возвращает результат завершения сессии',
  })
  @ApiOkResponse({
    description:
      'Сессия успешно завершена, возвратит данные завершенной сессии',
    type: ApiResultDto<ISessionFull>,
  })
  @ApiForbiddenResponse({
    description: 'Не удалось завершить сессию',
  })
  @Auth({
    defendType: 'api',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  public async deleteById(
    @Req() req: ReqWithCookies,
    @Query(`id`) sessionIdForDeleted: string,
  ): Promise<ApiResult<ISessionFull | null>> {
    /** Токен обновления пары токенов текущей сесиии */
    const incomingRefreshTokenCurrentSession = req.cookies?.refreshToken;
    /** Идентификатор аккаунта  */
    const accountId = req.authData?.accountDto.id;

    /** Результаты чтения сессий */
    const resultDeleted = await this.sessionDeleteUseCaseService.deleteById(
      sessionIdForDeleted,
      accountId as string,
      incomingRefreshTokenCurrentSession,
    );

    const returned: ApiResult<ISessionFull | null> = {
      error: resultDeleted.error,
      successMessages: resultDeleted.successMessages,
      errorMessages: resultDeleted.errorMessages,
      data: resultDeleted.data,
    };

    if (resultDeleted.error || !resultDeleted.data) {
      // TODO: ElmirKuba 2025-08-20: Разобраться NOT_FOUND тут или ветвление как в апи создания пароля
      throw new HttpException(returned, HttpStatus.FORBIDDEN);
    }

    return returned;
  }

  /**
   * Удаление всех сессий кроме текущей
   * @param {ReqWithCookies} req - Попутные данные при запросе на данное REST API
   * @returns {Promise<ApiResult<EndOfSessions | nullnull>>} - Результат удаления своей сессии зная ее ID + данные самой удаленной сессии в случае успеха
   * @public
   */
  @Post('clear-others')
  @ApiOperation({
    summary:
      'Этот метод отправляет запрос на завершение всех сессий текущего аккаунта кроме текущей (везде где он авторизован, произойдет разлогин)',
    description:
      'При отсутствии ошибок возвращает результат завершения сессий всех сессий кроме текущей',
  })
  @ApiOkResponse({
    description:
      'Сессии успешно завершена, возвратит данные завершенны сессий массивом',
    type: ApiResultDto<EndOfSessions | null>,
  })
  @ApiForbiddenResponse({
    description: 'Не удалось завершить сессии',
  })
  @Auth({
    defendType: 'api',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  public async clearOthers(
    @Req() req: ReqWithCookies,
  ): Promise<ApiResult<EndOfSessions | null>> {
    /** Токен обновления пары токенов текущей сесиии */
    const incomingRefreshTokenCurrentSession = req.cookies?.refreshToken;
    /** Идентификатор аккаунта  */
    const accountId = req.authData?.accountDto.id;

    /** Результат удаления всех сессий кроме текущей */
    const resultDeletedSession =
      await this.sessionDeleteUseCaseService.clearOthers(
        accountId as string,
        incomingRefreshTokenCurrentSession,
      );

    const returned: ApiResult<EndOfSessions | null> = {
      error: resultDeletedSession.error,
      successMessages: resultDeletedSession.successMessages,
      errorMessages: resultDeletedSession.errorMessages,
      data: resultDeletedSession.data,
    };

    if (resultDeletedSession.error || !resultDeletedSession.data) {
      // TODO: ElmirKuba 2025-08-20: Разобраться NOT_FOUND тут или ветвление как в апи создания пароля
      throw new HttpException(returned, HttpStatus.FORBIDDEN);
    }

    return returned;
  }
}
