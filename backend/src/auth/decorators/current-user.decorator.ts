import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../types/jwt-payload.type';

/** HTTP-запрос с прикреплённым payload авторизованного пользователя. */
interface AuthenticatedRequest extends Request {
  /** Payload текущего JWT. */
  user: JwtPayload;
}

/** Param-декоратор, извлекающий payload текущего JWT из request.user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
