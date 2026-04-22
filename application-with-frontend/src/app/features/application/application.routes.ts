import type { Routes } from '@angular/router';
import type { MainApplicationComponent } from './main/components/main/main.component';

/** Основной массив маршрутизации application-составляющей */
export const APPLICATION_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'main',
  },
  {
    path: 'main',
    loadComponent: async (): Promise<typeof MainApplicationComponent> => {
      const m = await import('./main/components/main/main.component');
      return m.MainApplicationComponent;
    },
  },
  {
    path: '**',
    redirectTo: 'main',
  },
];
