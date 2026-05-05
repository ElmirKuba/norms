import { type ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { StorageService } from './core/services/storage/storage.service';
import { storageServiceFactory } from './core/services/storage/storage.provider';
import { PlatformDetectorService } from './core/services/platform/platform.service';
import { ThemeService } from './core/services/theme/theme.service';

/** Основной конфигурационный объект продукта */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: StorageService,
      useFactory: storageServiceFactory,
      deps: [PlatformDetectorService],
    },
    provideAppInitializer((): void => {
      inject(ThemeService).init();
    }),
  ],
};
