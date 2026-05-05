import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { PlatformDetectorService } from './core/services/platform/platform.service';
import { nativeOnlyGuard, webOnlyGuard } from './core/guards/platform.guard';

/** Основной массив маршрутизации продукта */
export const routes: Routes = [
  // Корневой путь — платформо-зависимый redirect
  {
    path: '',
    pathMatch: 'full',
    redirectTo: (): string => {
      const platform = inject(PlatformDetectorService);
      return platform.isWeb ? '/web/welcome' : '/application/welcome';
    },
  },

  // Web-лендинг — только браузер
  {
    path: 'web',
    canMatch: [webOnlyGuard],
    loadChildren: async (): Promise<Routes> => {
      const content = await import('./features/web/web.routes');
      return content.WEB_ROUTES;
    },
  },
  // Fallback: если зашёл на /web/* с нативной платформы → приложение
  {
    path: 'web',
    redirectTo: '/application/welcome',
  },

  // Приложение-мессенджер — только нативные платформы (Capacitor / Electron)
  {
    path: 'application',
    canMatch: [nativeOnlyGuard],
    loadChildren: async (): Promise<Routes> => {
      const content = await import('./features/application/application.routes');
      return content.APPLICATION_ROUTES;
    },
  },
  // Fallback: если зашёл на /application/* из браузера → лендинг
  {
    path: 'application',
    redirectTo: '/web/welcome',
  },

  // Любой несуществующий путь → корень (который уже редиректит по платформе)
  {
    path: '**',
    redirectTo: '',
  },
];
