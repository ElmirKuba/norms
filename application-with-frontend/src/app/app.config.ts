import { type ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { PlatformDetectorService } from './core/services/platform/platform.service';
import { StorageService } from './core/services/storage/storage.service';
import { storageServiceFactory } from './core/services/storage/storage.provider';
import { SecureStorageService } from './core/services/secure-storage/secure-storage.service';
import { secureStorageServiceFactory } from './core/services/secure-storage/secure-storage.provider';
import { LocalDbService } from './core/services/local-db/local-db.service';
import { localDbServiceFactory } from './core/services/local-db/local-db.provider';
import { ClipboardService } from './core/services/clipboard/clipboard.service';
import { clipboardServiceFactory } from './core/services/clipboard/clipboard.provider';
import { ThemeService } from './core/services/theme/theme.service';
import { FeatureFlagsService } from './core/services/feature-flags/feature-flags.service';
import { TokenStorageService } from './core/services/storage/token-storage.service';
import { SessionApiService } from './core/services/session/session-api.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { WssService } from './core/services/wss/wss.service';
import { ChatEventsService } from './core/services/chat/chat-events.service';

/**
 * Декодирует поле sub (accountId) из JWT без внешних библиотек.
 * @param token - Access-токен.
 * @returns accountId или null при ошибке.
 */
function decodeAccountId(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[1] === undefined) return null;
  try {
    const padded = parts[1].replace(/-/gu, '+').replace(/_/gu, '/');
     
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const sub = payload['sub'];
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

/** Основной конфигурационный объект приложения */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    {
      provide: StorageService,
      useFactory: storageServiceFactory,
      deps: [PlatformDetectorService],
    },
    {
      provide: SecureStorageService,
      useFactory: secureStorageServiceFactory,
      deps: [PlatformDetectorService],
    },
    {
      provide: LocalDbService,
      useFactory: localDbServiceFactory,
      deps: [PlatformDetectorService],
    },
    {
      provide: ClipboardService,
      useFactory: clipboardServiceFactory,
      deps: [PlatformDetectorService],
    },
    provideAppInitializer((): void => {
      inject(ThemeService).init();
    }),
    // Восстановить токены из OS keychain, обновить через refresh-token, подключить WSS.
    // Выполняется до монтирования компонентов — интерцептор получит свежий access-токен.
    provideAppInitializer(async (): Promise<void> => {
      const tokenStorage = inject(TokenStorageService);
      const sessionApi = inject(SessionApiService);
      const wss = inject(WssService);
      const localDb = inject(LocalDbService);
      const chatEvents = inject(ChatEventsService);

      await tokenStorage.loadFromStorage();

      const refreshToken = tokenStorage.refreshToken;
      if (refreshToken === null) return;

      try {
        const result = await firstValueFrom(sessionApi.refresh(refreshToken));
        tokenStorage.store(result.access_token, result.refresh_token);
        const accountId = decodeAccountId(result.access_token);
        if (accountId !== null) await localDb.initialize(accountId);
        chatEvents.init();
        wss.connect();
      } catch (err) {
        // Чистим токены только при явном отказе сервера (401/403) — токен невалиден.
        // Сетевая ошибка (status 0) или 5xx = бэк недоступен, токен всё ещё действителен.
        if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
          tokenStorage.clear();
        } else {
          // Бэк недоступен — инициализируем локальную БД из кешированного accountId
          const cachedAccountId = decodeAccountId(tokenStorage.accessToken ?? '');
          if (cachedAccountId !== null) {
            await localDb.initialize(cachedAccountId);
            chatEvents.init();
          }
        }
      }
    }),
    provideAppInitializer(async (): Promise<void> => firstValueFrom(inject(FeatureFlagsService).load())),
  ],
};
