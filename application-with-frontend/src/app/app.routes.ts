import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'web',
    loadChildren: async (): Promise<Routes> => {
      const content = await import('./features/web/web.routes');
      return content.WEB_ROUTES;
    },
  },
  {
    path: 'application',
    loadChildren: async (): Promise<Routes> => {
      const content = await import('./features/application/application.routes');
      return content.APPLICATION_ROUTES;
    },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
