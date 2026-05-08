import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { HttpInterceptorFn, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import type { RefreshTokenResponse } from '../services/session/session-api.service';
import { TokenStorageService } from '../services/storage/token-storage.service';
import { SessionApiService } from '../services/session/session-api.service';

/** true пока выполняется запрос на обновление токена — защита от гонки. */
let isRefreshing: boolean = false;

/**
 * Транслирует новый access-токен всем запросам, ждавшим окончания рефреша.
 * null — рефреш ещё в процессе.
 */
const refreshSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

/**
 * Клонирует запрос с Bearer-токеном.
 * @param req - Исходный запрос.
 * @param token - Access-токен.
 * @returns Клон запроса с заголовком Authorization.
 */
function withBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  /* eslint-disable @typescript-eslint/naming-convention -- HTTP-заголовок Authorization использует PascalCase */
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * HTTP-интерцептор авторизации.
 * Прикрепляет Bearer access-токен к каждому запросу.
 * При ответе 401 — ротирует токены через refresh-token и повторяет запрос.
 * Параллельные запросы во время рефреша ставятся в очередь и повторяются автоматически.
 * @param req - Исходящий HTTP-запрос.
 * @param next - Следующий обработчик в цепочке.
 * @returns Observable с HTTP-событиями.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const tokenStorage = inject(TokenStorageService);
  const sessionApi = inject(SessionApiService);

  const token = tokenStorage.accessToken;
  const authReq = token !== null ? withBearer(req, token) : req;

  return next(authReq).pipe(
    catchError((error: unknown): Observable<HttpEvent<unknown>> => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError((): unknown => error);
      }

      // Refresh-токен сам вернул 401 — токен недействителен, чистим сессию
      if (req.url.includes('/session/refresh')) {
        tokenStorage.clear();
        return throwError((): unknown => error);
      }

      const refreshToken = tokenStorage.refreshToken;
      if (refreshToken === null) {
        return throwError((): unknown => error);
      }

      if (isRefreshing) {
        // Дождаться окончания параллельного рефреша и повторить с новым токеном
        return refreshSubject.pipe(
          filter((t: string | null): t is string => t !== null),
          take(1),
          switchMap((newToken: string): Observable<HttpEvent<unknown>> => next(withBearer(req, newToken))),
        );
      }

      isRefreshing = true;
      refreshSubject.next(null);

      return sessionApi.refresh(refreshToken).pipe(
        switchMap((result: RefreshTokenResponse): Observable<HttpEvent<unknown>> => {
          isRefreshing = false;
          tokenStorage.store(result.access_token, result.refresh_token);
          refreshSubject.next(result.access_token);
          return next(withBearer(req, result.access_token));
        }),
        catchError((refreshError: unknown): Observable<HttpEvent<unknown>> => {
          isRefreshing = false;
          tokenStorage.clear();
          return throwError((): unknown => refreshError);
        }),
      );
    }),
  );
};
