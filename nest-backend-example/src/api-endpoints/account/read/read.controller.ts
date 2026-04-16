import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  Query,
  Req,
} from '@nestjs/common';
import { Auth } from '../../../utility-level/decorators/auth.decorator';
import type { ReqWithCookies } from '../../../interfaces/systems/req-with-cookies.interface';
import { AccountReadUseCaseService } from '../../../use-cases-level/account/read/read.use-case.service';
import { IAccountWithoutPassword } from '../../../interfaces/full/account/account-without-password.interface';
import { ApiResult } from '../../../interfaces/api/api-interfaces';
import { ApiResultDto } from '../../../dtos/output/api/api-result.dto';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/** Контроллер REST-API связанный с функционалом чтения аккаунта */
@ApiTags('Прочитать данные аккаунта')
@Controller('account')
export class ApiReadAccountController {
  /**
   * Конструктор контроллера системы
   * @param {AccountReadUseCaseService} accountReadUseCaseService - Экземпляр сервиса бизнес логики уровня Use-Case чтения аккаунта
   */
  constructor(private accountReadUseCaseService: AccountReadUseCaseService) {}

  /**
   * REST-API Get эндпоинт чтения аккаунта по ID или своего без необходимости указывать ID
   * @param {ReqWithCookies} req - Попутные данные при запросе на данное REST API
   * @param {string} id - Query-param идентификатор запрашиваемого аккаунта
   * @returns {Promise<UseCaseResult<IAccountWithoutPassword | null>>} - Результат чтения аккаунта
   * @public
   */
  @Get('read')
  @ApiOperation({
    summary:
      'Этот метод отправляет запрос то, чтобы получить данные аккаунта по ID или своего аккаунта в котором авторизован по cookie если ID не указан',
    description:
      'При отсутствии ошибок возвращает результат с данными аккаунта',
  })
  @ApiOkResponse({
    description: 'Данные аккаунта успешно получены',
    type: ApiResultDto<IAccountWithoutPassword | null>,
  })
  @ApiUnauthorizedResponse({
    description:
      'Вы не авторизованы и у вас нет прав использовать данный функционал',
  })
  @ApiQuery({
    name: 'id',
    type: 'string',
    description: 'Укажите идентификатор аккаунта',
    required: false,
  })
  @Auth({
    defendType: 'api',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  public async read(
    @Req() req: ReqWithCookies,
    @Query(`id`) id?: string,
  ): Promise<ApiResult<IAccountWithoutPassword | null>> {
    /** Если id передан в query — используем его, иначе fallback на authData */
    const accountId = id || req.authData?.accountDto.id;

    /** Результат работы сервиса бизнес логики уровня Use-Case чтения аккаунта */
    const resultRead = await this.accountReadUseCaseService.read(
      accountId as string,
    );

    /** Формируем данные для отправки на Frontend */
    const result: ApiResult<IAccountWithoutPassword | null> = {
      error: resultRead.error,
      errorMessages: resultRead.errorMessages,
      successMessages: resultRead.successMessages,
      data: resultRead.data,
    };

    if (resultRead.error) {
      // TODO: ElmirKuba 2025-08-20: Разобраться NOT_FOUND тут или ветвление как в апи создания пароля
      throw new HttpException(result, HttpStatus.NOT_FOUND);
    }

    return result;
  }
}
