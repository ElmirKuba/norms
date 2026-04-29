import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { StorageService } from './core/services/storage/storage.service';
import { storageServiceFactory } from './core/services/storage/storage.provider';
import { PlatformDetectorService } from './core/services/platform/platform.service';

/** Основной конфигурационный объект продукта */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideRouter(routes),
    {
      provide: StorageService,
      useFactory: storageServiceFactory,
      deps: [PlatformDetectorService],
    },
  ],
};
