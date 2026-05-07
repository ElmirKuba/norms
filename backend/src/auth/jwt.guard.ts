import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from './types/jwt-payload.type';

/** Тип HTTP-запроса с прикреплённым payload авторизованного пользователя. */
interface AuthenticatedRequest extends Request {
  /** Payload текущего JWT. */
  user: JwtPayload;
}

/** Guard для защиты маршрутов через JWT access-токен. */
@Injectable()
export class JwtGuard implements CanActivate {
  public constructor(private readonly _jwtService: JwtService) {}

  /**
   * Проверяет JWT из заголовка Authorization и прикрепляет payload к request.user.
   * @param context - Контекст выполнения NestJS.
   * @returns true если токен валиден.
   * @throws UnauthorizedException если токен отсутствует или невалиден.
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this._extractToken(request);
    if (token === null) {
      throw new UnauthorizedException({
        code: 'missing_token',
        message: 'Authorization header отсутствует',
      });
    }
    try {
      const payload = await this._jwtService.verifyAsync<JwtPayload>(token);
      (request as AuthenticatedRequest).user = payload;
    } catch {
      throw new UnauthorizedException({
        code: 'invalid_token',
        message: 'Токен невалиден или истёк',
      });
    }
    return true;
  }

  /**
   * Извлекает Bearer-токен из заголовка Authorization.
   * @param request - HTTP-запрос.
   * @returns Строка токена или null если заголовок отсутствует/некорректен.
   */
  private _extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return null;
    }
    const token = auth.slice(7);
    return token.length > 0 ? token : null;
  }
}
