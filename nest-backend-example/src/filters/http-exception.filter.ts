import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  ValidationError,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiResult } from '../interfaces/api/api-interfaces';

/** Контракт стандартного тела ответа из HttpException.getResponse() */
interface StandardErrorPayload {
  /** HTTP-статус ошибки, обычно совпадает со статусом исключения */
  statusCode?: number;
  /** Текст или массив текстов сообщений об ошибке */
  message?: string | string[];
  /** Краткое описание типа ошибки, например "Bad Request" */
  error?: string;
}

/**
 * Функция обработки ошибок
 * @param {ValidationError[]} errors - Массив ошибок валидации
 * @returns {never} - Ничего не возвращает
 * */
export const exceptionFactoryHandler = (errors: ValidationError[]): never => {
  /** Массив с ошибками от валидатора преобразуем в массив ошибок для API */
  const errorMessages = errors.flatMap((err) =>
    Object.values(err.constraints || {}),
  );

  throw new HttpException(
    {
      error: true,
      successMessages: [],
      errorMessages,
      data: null,
    },
    HttpStatus.BAD_REQUEST,
  );
};

/** Класс фильтрующий исключения */
@Catch(HttpException)
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();

    const statusCode = exception.getStatus();
    const responseBody = exception.getResponse() as
      | ApiResult<null>
      | StandardErrorPayload;

    let apiResult: ApiResult<null>;

    if (
      typeof responseBody === 'object' &&
      'error' in responseBody &&
      'errorMessages' in responseBody
    ) {
      apiResult = responseBody;
    } else {
      const message =
        typeof responseBody === 'object' && responseBody.message
          ? responseBody.message
          : exception.message || 'Internal error';

      apiResult = {
        error: true,
        errorMessages: Array.isArray(message) ? message : [message],
        successMessages: [],
        data: null,
      } satisfies ApiResult<null>;
    }

    httpAdapter.reply(ctx.getResponse(), apiResult, statusCode);
  }
}
