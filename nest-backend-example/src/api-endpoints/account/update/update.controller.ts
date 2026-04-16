import {
  Controller,
  Patch,
  HttpStatus,
  HttpCode,
  Body,
  Header,
  HttpException,
} from '@nestjs/common';
import { AccountToUpdateDataDto } from '../../../dtos/input/account/account-to-input-data.dto';
import { Auth } from '../../../utility-level/decorators/auth.decorator';
import { AccountUpdateUseCaseService } from '../../../use-cases-level/account/update/update.use-case.service';
import { ApiResult } from '../../../interfaces/api/api-interfaces';
import { ApiResultDto } from '../../../dtos/output/api/api-result.dto';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
/** Контроллер REST-API связанный с функционалом чтения аккаунта */
@ApiTags('Обновить данные аккаунта')
@Controller('account')
export class ApiUpdateAccountController {
  /**
   * Конструктор контроллера системы
   * @param {AccountUpdateUseCaseService} accountUpdateUseCaseService - Экземпляр сервиса модуля бизнес логики уровня UseCase обновления аккаунта
   **/
  constructor(
    private accountUpdateUseCaseService: AccountUpdateUseCaseService,
  ) {}

  /**
   * Обновление данных аккаунтааккаунта
   * @param {AccountToUpdateDataDto} accountToUpdateDataDto - Данные для обновления аккаунта
   * @returns {Promise<ApiResult<null>>} - Результат работы REST-API Post эндпоинта создания аккаунта
   * @public
   */
  @Patch('update')
  @ApiOperation({
    summary: 'Этот метод отправляет запрос на обновление данных аккаунта',
    description:
      'При отсутствии ошибок возвращает результат обновления аккаунта',
  })
  @ApiOkResponse({
    description: 'Аккаунт успешно обновлен',
    type: ApiResultDto<null>,
  })
  @ApiBadRequestResponse({
    description: 'Не получилось обновить аккаунт',
  })
  @Auth({
    defendType: 'api',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  public async update(
    @Body() accountToUpdateDataDto: AccountToUpdateDataDto,
  ): Promise<ApiResult<null>> {
    /** Результат создания аккаунта */
    const resultUpdate = await this.accountUpdateUseCaseService.update(
      accountToUpdateDataDto,
    );

    const returned: ApiResult<null> = {
      error: resultUpdate.error,
      successMessages: resultUpdate.successMessages,
      errorMessages: resultUpdate.errorMessages,
      data: resultUpdate.data,
    };

    if (resultUpdate.error) {
      // TODO: ElmirKuba 2025-08-20: Разобраться BAD_REQUEST тут или ветвление как в апи создания пароля
      throw new HttpException(returned, HttpStatus.BAD_REQUEST);
    }

    return returned;
  }
}
