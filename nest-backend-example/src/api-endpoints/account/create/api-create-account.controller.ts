import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { AccountCreateUseCaseService } from '../../../use-cases-level/account/create/account-create.use-case.service';
import { ApiResult } from '../../../interfaces/api/api-interfaces';
import { AccountToInputDataDto } from '../../../dtos/input/account/account-to-input-data.dto';
import { UseCaseResult } from '../../../interfaces/systems/use-case-result.interface';
import { EnumerationErrorCodes } from '../../../interfaces/systems/error-codes.interface';
import { ApiResultDto } from '../../../dtos/output/api/api-result.dto';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

/** Контроллер модуля REST-API связанного с функционалом создания аккаунта */
@ApiTags('Создание аккаунта')
@Controller('account')
export class ApiCreateAccountController {
  /**
   * Конструктор контроллера системы
   * @param {AccountCreateUseCaseService} accountCreateUseCaseService - Экземпляр сервиса модуля бизнес логики уровня UseCase создания аккаунта
   **/
  constructor(
    private accountCreateUseCaseService: AccountCreateUseCaseService,
  ) {}

  /**
   * Создание нового аккаунта
   * @param {AccountToInputDataDto} accountToInputDataDto - Провалидированные DTO`s данные аккаунта для создания аккаунта
   * @returns {Promise<ApiResult<null>>} - Результат работы REST-API Post эндпоинта создания аккаунта
   * @public
   **/
  @Post('create')
  @ApiOperation({
    summary: 'Этот метод отправляет запрос на создание аккаунта',
    description:
      'При отсутствии ошибок возвращает результат создания нового аккаунта',
  })
  @ApiCreatedResponse({
    description: 'Новый аккаунт успешно создан',
    type: ApiResultDto<null>,
  })
  @ApiConflictResponse({
    description: 'Новый аккаунт создать не получится, логин занят!',
  })
  @ApiInternalServerErrorResponse({
    description: 'Произошла прочая какая-то ошибка',
  })
  @HttpCode(HttpStatus.CREATED)
  public async create(
    @Body() accountToInputDataDto: AccountToInputDataDto,
  ): Promise<ApiResult<null>> {
    /** Результат создания аккаунта */
    const resultCreate: UseCaseResult<null> =
      await this.accountCreateUseCaseService.create(accountToInputDataDto);

    const returned: ApiResult<null> = {
      error: resultCreate.error,
      successMessages: resultCreate.successMessages,
      errorMessages: resultCreate.errorMessages,
      data: resultCreate.data,
    };

    if (resultCreate.error) {
      switch (resultCreate.errorCode) {
        case EnumerationErrorCodes.ERROR_CODE_ALREADY_EXISTS: {
          throw new ConflictException(returned);
        }
        case EnumerationErrorCodes.ERROR_CODE_INTERNAL_ERROR: {
          throw new InternalServerErrorException(returned);
        }
        default: {
          throw new InternalServerErrorException(returned);
        }
      }
    }
    return returned;
  }
}
