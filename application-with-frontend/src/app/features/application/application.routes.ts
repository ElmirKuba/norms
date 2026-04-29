import type { Routes } from '@angular/router';
import type { MainApplicationComponent } from './main/components/main/main.component';
import type { WelcomeApplicationComponent } from './auth/components/welcome/welcome.component';
import type { AuthShellComponent } from './auth/components/auth-shell/auth-shell.component';
import type { InviteCodeApplicationComponent } from './auth/components/invite-code/invite-code.component';
import type { CreateAccountApplicationComponent } from './auth/components/create-account/create-account.component';
import type { LoginApplicationComponent } from './auth/components/login/login.component';
import type { UinPendingApplicationComponent } from './uin/components/uin-pending/uin-pending.component';
import type { UinAssignedApplicationComponent } from './uin/components/uin-assigned/uin-assigned.component';

/** Основной массив маршрутизации application-составляющей */
export const APPLICATION_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'welcome',
  },

  // Стартовый экран
  {
    path: 'welcome',
    loadComponent: async (): Promise<typeof WelcomeApplicationComponent> => {
      const m = await import('./auth/components/welcome/welcome.component');
      return m.WelcomeApplicationComponent;
    },
  },

  // Auth shell — общий header (back + theme) для экранов регистрации/входа
  {
    path: 'auth',
    loadComponent: async (): Promise<typeof AuthShellComponent> => {
      const m = await import('./auth/components/auth-shell/auth-shell.component');
      return m.AuthShellComponent;
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'invite-code',
      },
      {
        path: 'invite-code',
        loadComponent: async (): Promise<typeof InviteCodeApplicationComponent> => {
          const m = await import('./auth/components/invite-code/invite-code.component');
          return m.InviteCodeApplicationComponent;
        },
      },
      {
        path: 'create-account',
        loadComponent: async (): Promise<typeof CreateAccountApplicationComponent> => {
          const m = await import('./auth/components/create-account/create-account.component');
          return m.CreateAccountApplicationComponent;
        },
      },
      {
        path: 'login',
        loadComponent: async (): Promise<typeof LoginApplicationComponent> => {
          const m = await import('./auth/components/login/login.component');
          return m.LoginApplicationComponent;
        },
      },
    ],
  },

  // UIN экраны
  {
    path: 'uin',
    children: [
      {
        path: 'pending',
        loadComponent: async (): Promise<typeof UinPendingApplicationComponent> => {
          const m = await import('./uin/components/uin-pending/uin-pending.component');
          return m.UinPendingApplicationComponent;
        },
      },
      {
        path: 'assigned',
        loadComponent: async (): Promise<typeof UinAssignedApplicationComponent> => {
          const m = await import('./uin/components/uin-assigned/uin-assigned.component');
          return m.UinAssignedApplicationComponent;
        },
      },
    ],
  },

  // Основное приложение (мессенджер)
  {
    path: 'main',
    loadComponent: async (): Promise<typeof MainApplicationComponent> => {
      const m = await import('./main/components/main/main.component');
      return m.MainApplicationComponent;
    },
  },

  {
    path: '**',
    redirectTo: 'welcome',
  },
];
