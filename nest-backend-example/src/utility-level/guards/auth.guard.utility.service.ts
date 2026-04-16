import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ValidateTokensManagerService } from '../../managers-level/tokens/validate-tokens/validate-tokens.manager.service';
import { ReqWithCookies } from '../../interfaces/systems/req-with-cookies.interface';
import { Reflector } from '@nestjs/core';
import { METADATA_KEY_DEFEND } from '../decorators/auth.decorator';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { IValidateToken } from '../../interfaces/systems/validate-token.interface';

/** Защитник REST-API от не санкционированного доступа */
@Injectable()
export class AuthGuardService implements CanActivate {
  /**
   * Конструктор сервиса системы
   * @param {ValidateTokensManagerService} validateTokensManagerService — Экземпляр сервиса модуля валидации JWT токенов
   * @param {Reflector} reflector — Helper class providing Nest reflection capabilities
   */
  constructor(
    private readonly validateTokensManagerService: ValidateTokensManagerService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Метод проверяющий разрешение на доступ
   * @param {ExecutionContext} context Текущий контекст выполнения. Предоставляет доступ к подробной информации о текущем конвейере запросов.
   * @returns {boolean | Promise<boolean> | Observable<boolean>} Значение, указывающее, разрешено ли выполнение текущего запроса.
   */
  public canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    /** Что защищает */
    let requiredDefend = this.reflector.getAllAndOverride<'api' | 'ws'>(
      METADATA_KEY_DEFEND,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredDefend) {
      // автоопределение по типу контекста
      const ctxType = context.getType();
      requiredDefend = ctxType === 'ws' ? 'ws' : 'api';
    }

    if (requiredDefend === 'api') {
      /** HTTP context */
      const request = context.switchToHttp().getRequest<ReqWithCookies>();

      if (!request) {
        throw new UnauthorizedException('Неправильный HTTP контекст');
      }

      /** Токен доступа из куков httpOnly */
      const accessToken = request.cookies?.accessToken;

      const resultValidateAccessToken = this.validateAccessToken(
        accessToken,
        requiredDefend,
      );

      if (!resultValidateAccessToken.data) {
        throw new UnauthorizedException('Не удалось извлечь данные токена');
      }

      request.authData = resultValidateAccessToken.data;
      return true;
    } else {
      /** WS context (socket.io) */
      const client: Socket = context.switchToWs().getClient<Socket>();

      if (!client) {
        throw new WsException('Неправильный WS контекст');
      }

      /** Получаем все заголовки */
      const headers = client.handshake?.headers || {};

      /** Токен доступа из заголовков WS */
      const accessToken = headers['accesstoken'] as string;

      const resultValidateAccessToken = this.validateAccessToken(
        accessToken,
        requiredDefend,
      );

      if (!resultValidateAccessToken.data) {
        throw new WsException('Не удалось извлечь данные токена');
      }

      (client.data as ReqWithCookies).authData = resultValidateAccessToken.data;

      return true;
    }
  }

  validateAccessToken(
    accessToken: string,
    requiredDefend: 'api' | 'ws' = 'api',
  ): IValidateToken {
    if (!accessToken) {
      throw requiredDefend === 'api'
        ? new UnauthorizedException(
            'У вас нет доступа к функционалу, вы не авторизованы!',
          )
        : new WsException(
            'У вас нет доступа к WebSocket — требуется accessToken в заголовках handshake.',
          );
    }

    /** Результат валидации токена доступа */
    const resultValidateAccessToken =
      this.validateTokensManagerService.validateAnyToken(
        accessToken,
        'accessToken',
      );

    if (resultValidateAccessToken.error) {
      if (
        resultValidateAccessToken.errorMessages?.some((errMes) => {
          return errMes.includes('jwt expired');
        })
      ) {
        const errorText =
          'Срок действия доступа истек, сессию требуется обновить';

        throw requiredDefend === 'api'
          ? new UnauthorizedException(errorText)
          : new WsException(errorText);
      }

      const errorText = 'Доступ истек или был подделан';

      throw requiredDefend === 'api'
        ? new UnauthorizedException(errorText)
        : new WsException(errorText);
    }

    return resultValidateAccessToken;
  }
}
