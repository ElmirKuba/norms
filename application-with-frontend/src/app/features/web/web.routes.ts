import type { Routes } from '@angular/router';
import { MainWebComponent } from './main/components/main/main.component';
import type { WelcomeWebComponent } from './welcome/components/welcome/welcome.component';
import type { AboutWebComponent } from './about/components/about/about.component';
import type { SecurityWebComponent } from './security/components/security/security.component';

/** Основной массив маршрутизации web-составляющей */
export const WEB_ROUTES: Routes = [
  {
    path: '',
    component: MainWebComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'welcome',
      },
      {
        path: 'welcome',
        loadComponent: async (): Promise<typeof WelcomeWebComponent> => {
          const m = await import('./welcome/components/welcome/welcome.component');
          return m.WelcomeWebComponent;
        },
      },
      {
        path: 'about',
        loadComponent: async (): Promise<typeof AboutWebComponent> => {
          const m = await import('./about/components/about/about.component');
          return m.AboutWebComponent;
        },
      },
      {
        path: 'security',
        loadComponent: async (): Promise<typeof SecurityWebComponent> => {
          const m = await import('./security/components/security/security.component');
          return m.SecurityWebComponent;
        },
      },
      {
        path: '**',
        redirectTo: 'welcome',
      },
    ],
  },
];
