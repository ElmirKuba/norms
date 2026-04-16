import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Auth } from '../../../utility-level/decorators/auth.decorator';
import type { ReqWithCookies } from '../../../interfaces/systems/req-with-cookies.interface';
import { SessionReadUseCaseService } from '../../../use-cases-level/session/read/read.use-case.service';
import { ApiResult } from '../../../interfaces/api/api-interfaces';
import { ISessionFull } from '../../../interfaces/full/session/session-full.interface';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResultDto } from '../../../dtos/output/api/api-result.dto';

/** Контроллер REST-API связанного с функционалом чтения сессий */
@ApiTags('Прочитать все сессии текущего аккаунта')
@Controller('session')
export class ApiReadSessionController {
  /**
   * Конструктор контроллера системы
   * @param {SessionReadUseCaseService} sessionReadUseCaseService - Экземпляр сервиса модуля бизнес логики уровня UseCase чтения сессий
   */
  constructor(private sessionReadUseCaseService: SessionReadUseCaseService) {}

  /**
   * REST API Получение всех сессий текущего аккаунта
   * @param {ReqWithCookies} req - Попутные данные при запросе на данное REST API
   * @returns {Promise<ApiResult<null>>} - Результат работы REST-API Post эндпоинта авторизации аккаунта
   * @public
   */
  @Get('read-list')
  @ApiOperation({
    summary:
      'Этот метод отправляет запрос на чтение всех сессий авторизованного аккаунта',
    description:
      'При отсутствии ошибок возвращает результат массивом всех сессий авторизованного аккаунта',
  })
  @ApiOkResponse({
    description: 'Получены все сессии аккаунта',
    type: ApiResultDto<null>,
  })
  @ApiNotFoundResponse({
    description:
      'Аккаунт не имеет сессий, возможно не где не авторизован в настоящий момент',
  })
  @Auth({
    defendType: 'api',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  public async readListByAccountId(
    @Req() req: ReqWithCookies,
  ): Promise<ApiResult<ISessionFull[] | null>> {
    /** Идентификатор аккаунта  */
    const accountId = req.authData?.accountDto.id;

    /** Результаты чтения сессий */
    const resultListRead =
      await this.sessionReadUseCaseService.readListByAccountId(
        accountId as string,
      );

    const returned: ApiResult<ISessionFull[] | null> = {
      error: resultListRead.error,
      successMessages: resultListRead.successMessages,
      errorMessages: resultListRead.errorMessages,
      data: resultListRead.data,
    };

    if (resultListRead.error || !resultListRead.data) {
      // TODO: ElmirKuba 2025-08-20: Разобраться NOT_FOUND тут или ветвление как в апи создания пароля
      throw new HttpException(returned, HttpStatus.NOT_FOUND);
    }

    return returned;
  }
}
