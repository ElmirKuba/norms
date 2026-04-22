import { Routes } from '@angular/router';

export const APPLICATION_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'main',
  },
  {
    path: 'main',
    loadComponent: () => {
      return import('./main/components/main/main.component').then((m) => {
        return m.MainApplicationComponent;
      });
    },
  },
  {
    path: '**',
    redirectTo: 'main',
  },
];
