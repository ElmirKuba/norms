import { ApiProperty } from '@nestjs/swagger';
import { ApiResult } from '../../../interfaces/api/api-interfaces';

/** DTO REST API выходное для приложений вызвавших API */
export class ApiResultDto<TypeResult = Record<string, unknown>>
  implements ApiResult<TypeResult>
{
  @ApiProperty({
    description: 'Статус наличия ошибки работы метода',
    example: false,
    type: Boolean,
    required: true,
  })
  error: boolean;

  @ApiProperty({
    description: 'Массив успешных сообщений',
    example: ['Успешная операция произошла'],
    type: Array<string>,
    required: true,
  })
  successMessages: string[];

  @ApiProperty({
    description: 'Массив неудачных сообщений',
    example: ['Неудачная операция произошла'],
    type: Array<string>,
    required: true,
  })
  errorMessages: string[];

  @ApiProperty({
    description: 'Объект результата работы API',
    example: {},
    type: Object,
    required: true,
  })
  data: TypeResult;
}
