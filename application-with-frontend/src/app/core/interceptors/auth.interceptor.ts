import { inject } from '@angular/core';
import type { HttpInterceptorFn, HttpEvent } from '@angular/common/http';
import type { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { TokenStorageService } from '../services/storage/token-storage.service';

/**
 * HTTP-интерцептор авторизации.
 * Прикрепляет Bearer-токен ко всем исходящим запросам.
 *
 * TODO: добавить авторефреш на 401 —
 *   1. Перехватить HttpErrorResponse со status === 401.
 *   2. Вызвать SessionApiService.refresh(refreshToken).
 *   3. Сохранить новую пару через TokenStorageService.store().
 *   4. Повторить исходный запрос с новым access-токеном.
 *   5. Если refresh вернул 401 — TokenStorageService.clear() + редирект на welcome.
 *   6. Защитить от гонки: если refresh уже выполняется — сбросить запрос в очередь.
 * @param req - Исходящий HTTP-запрос.
 * @param next - Следующий обработчик в цепочке.
 * @returns Observable с HTTP-событиями.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.accessToken;

  if (token === null) {
    return next(req);
  }

  /* eslint-disable @typescript-eslint/naming-convention -- HTTP-заголовок Authorization использует PascalCase */
  const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  /* eslint-enable @typescript-eslint/naming-convention */

  return next(authReq);
};
