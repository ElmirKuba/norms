import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { TokenStorageService } from '../services/storage/token-storage.service';

/**
 * Guard для защищённых маршрутов (main и вложенные).
 * Пропускает только если есть access-токен (загруженный через APP_INITIALIZER).
 * Иначе редиректит на стартовый экран.
 * @returns true или UrlTree для редиректа.
 */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const tokenStorage: TokenStorageService = inject(TokenStorageService);
  const router: Router = inject(Router);

  if (tokenStorage.accessToken !== null) {
    return true;
  }

  return router.createUrlTree(['/application/welcome']);
};
