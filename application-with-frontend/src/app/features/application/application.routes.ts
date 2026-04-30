import type { Routes } from '@angular/router';
import type { MainApplicationComponent } from './main/components/main/main.component';
import type { WelcomeApplicationComponent } from './auth/components/welcome/welcome.component';
import type { AuthShellComponent } from './auth/components/auth-shell/auth-shell.component';
import type { InviteCodeApplicationComponent } from './auth/components/invite-code/invite-code.component';
import type { CreateAccountApplicationComponent } from './auth/components/create-account/create-account.component';
import type { LoginApplicationComponent } from './auth/components/login/login.component';
import type { UinAssignedApplicationComponent } from './uin/components/uin-assigned/uin-assigned.component';
import type { ChatsApplicationComponent } from './chats/components/chats/chats.component';
import type { SearchApplicationComponent } from './search/components/search/search.component';
import type { SettingsApplicationComponent } from './settings/components/settings/settings.component';
import type { ProfileApplicationComponent } from './profile/components/profile/profile.component';

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

  // UIN экраны (uin/pending — модалка, открывается из create-account через UinModalService)
  {
    path: 'uin',
    children: [
      {
        path: 'assigned',
        loadComponent: async (): Promise<typeof UinAssignedApplicationComponent> => {
          const m = await import('./uin/components/uin-assigned/uin-assigned.component');
          return m.UinAssignedApplicationComponent;
        },
      },
    ],
  },

  // Основное приложение (мессенджер): shell с таббаром
  {
    path: 'main',
    loadComponent: async (): Promise<typeof MainApplicationComponent> => {
      const m = await import('./main/components/main/main.component');
      return m.MainApplicationComponent;
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'chats',
      },
      {
        path: 'chats',
        loadComponent: async (): Promise<typeof ChatsApplicationComponent> => {
          const m = await import('./chats/components/chats/chats.component');
          return m.ChatsApplicationComponent;
        },
      },
      {
        path: 'search',
        loadComponent: async (): Promise<typeof SearchApplicationComponent> => {
          const m = await import('./search/components/search/search.component');
          return m.SearchApplicationComponent;
        },
      },
      {
        path: 'settings',
        loadComponent: async (): Promise<typeof SettingsApplicationComponent> => {
          const m = await import('./settings/components/settings/settings.component');
          return m.SettingsApplicationComponent;
        },
      },
      {
        path: 'profile',
        loadComponent: async (): Promise<typeof ProfileApplicationComponent> => {
          const m = await import('./profile/components/profile/profile.component');
          return m.ProfileApplicationComponent;
        },
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'welcome',
  },
];
