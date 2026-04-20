import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { StorageService } from './services/storage/storage.service';
import { storageServiceFactory } from './services/storage/storage.provider';
import { PlatformDetectorService } from './services/platform/platform.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: StorageService,
      useFactory: storageServiceFactory,
      deps: [PlatformDetectorService],
    },
  ],
};
