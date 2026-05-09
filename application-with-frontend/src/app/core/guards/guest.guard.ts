import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { TokenStorageService } from '../services/storage/token-storage.service';

/**
 * Guard для гостевых маршрутов (welcome, auth/*).
 * Если пользователь уже авторизован — редиректит на главный экран.
 * Предотвращает показ welcome после восстановления сессии.
 * @returns true или UrlTree для редиректа.
 */
export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const tokenStorage: TokenStorageService = inject(TokenStorageService);
  const router: Router = inject(Router);

  if (tokenStorage.accessToken !== null) {
    return router.createUrlTree(['/application/main']);
  }

  return true;
};
