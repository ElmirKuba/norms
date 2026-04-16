import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
// import { IValidateToken } from '@backend/interfaces/systems';

/** Защитник REST-API от не санкционированного доступа */
@Injectable()
export class RoleGuardService implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Метод проверяющий разрешение на доступ
   * @param {ExecutionContext} context Текущий контекст выполнения. Предоставляет доступ к подробной информации о текущем конвейере запросов.
   * @returns {boolean | Promise<boolean> | Observable<boolean>} Значение, указывающее, разрешено ли выполнение текущего запроса.
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // /** Массив ролей, для которых открыт доступ к REST-API */
    // const requiredRoles = this.reflector.getAllAndOverride<string[]>(
    //   METADATA_KEY_ROLES,
    //   [context.getHandler(), context.getClass()]
    // );

    // if (!requiredRoles || requiredRoles.length === 0) {
    //   return true;
    // }

    // /** Попутные данные при запросе на данное REST API */
    // const request = context
    //   .switchToHttp()
    //   .getRequest<Request & { authData?: IValidateToken['data'] }>();

    // const userRoles =
    //   request.authData?.rolesDto?.map((r) => {
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-ignore
    //     return r.code;
    //   }) ?? [];

    // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // // @ts-ignore
    // if (!userRoles.some((role) => requiredRoles.includes(role))) {
    //   throw new UnauthorizedException(
    //     `Недостаточно прав. Требуются роли: ${requiredRoles.join(', ')}`
    //   );
    // }

    return true;
  }
}
