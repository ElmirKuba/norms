import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGuardService } from '../guards/auth.guard.utility.service';
import { RoleGuardService } from '../guards/role.guard.utility.service';

/** Мета-ключ для передачи по нему массива ролей */
export const METADATA_KEY_ROLES = 'METADATA_KEY_ROLES';

/** Мета-ключ для передачи по нему типа защиты */
export const METADATA_KEY_DEFEND = 'METADATA_KEY_DEFEND';

/** Метод возвращающий докератор проверки авторизации для доступа к REST API */
export const Auth = (
  authData: {
    roles?: string[];
    defendType?: 'api' | 'ws';
  } = {},
): MethodDecorator & ClassDecorator => {
  const { roles = [], defendType = 'api' } = authData;

  return applyDecorators(
    SetMetadata(METADATA_KEY_ROLES, roles),
    SetMetadata(METADATA_KEY_DEFEND, defendType),
    UseGuards(AuthGuardService, RoleGuardService),
  );
};
