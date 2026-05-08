import { type ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { PlatformDetectorService } from './core/services/platform/platform.service';
import { StorageService } from './core/services/storage/storage.service';
import { storageServiceFactory } from './core/services/storage/storage.provider';
import { SecureStorageService } from './core/services/secure-storage/secure-storage.service';
import { secureStorageServiceFactory } from './core/services/secure-storage/secure-storage.provider';
import { ThemeService } from './core/services/theme/theme.service';
import { FeatureFlagsService } from './core/services/feature-flags/feature-flags.service';
import { TokenStorageService } from './core/services/storage/token-storage.service';
import { SessionApiService } from './core/services/session/session-api.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { WssService } from './core/services/wss/wss.service';

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
    provideAppInitializer((): void => {
      inject(ThemeService).init();
    }),
    // Восстановить токены из OS keychain, обновить через refresh-token, подключить WSS.
    // Выполняется до монтирования компонентов — интерцептор получит свежий access-токен.
    provideAppInitializer(async (): Promise<void> => {
      const tokenStorage = inject(TokenStorageService);
      const sessionApi = inject(SessionApiService);
      const wss = inject(WssService);

      await tokenStorage.loadFromStorage();

      const refreshToken = tokenStorage.refreshToken;
      if (refreshToken === null) return;

      try {
        const result = await firstValueFrom(sessionApi.refresh(refreshToken));
        tokenStorage.store(result.access_token, result.refresh_token);
        wss.connect();
      } catch {
        // Refresh-токен истёк или уже использован — требуется повторный логин
        tokenStorage.clear();
      }
    }),
    provideAppInitializer(async (): Promise<void> => firstValueFrom(inject(FeatureFlagsService).load())),
  ],
};
