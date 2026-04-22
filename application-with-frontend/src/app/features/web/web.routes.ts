import { Routes } from '@angular/router';

export const WEB_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'main',
  },
  {
    path: 'main',
    loadComponent: () => {
      return import('./main/components/main/main.component').then((m) => {
        return m.MainWebComponent;
      });
    },
  },
  {
    path: '**',
    redirectTo: 'main',
  },
];
