import type { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import type { MainApplicationComponent } from './main/components/main/main.component';
import type { WelcomeApplicationComponent } from './auth/components/welcome/welcome.component';
import type { AuthShellComponent } from './auth/components/auth-shell/auth-shell.component';
import type { InviteCodeApplicationComponent } from './auth/components/invite-code/invite-code.component';
import type { CreateAccountApplicationComponent } from './auth/components/create-account/create-account.component';
import type { LoginApplicationComponent } from './auth/components/login/login.component';
import type { RecoveryApplicationComponent } from './auth/components/recovery/recovery.component';
import type { UinAssignedApplicationComponent } from './uin/components/uin-assigned/uin-assigned.component';
import type { ChatsApplicationComponent } from './chats/components/chats/chats.component';
import type { ChatDetailApplicationComponent } from './chats/components/chat-detail/chat-detail.component';
import type { SearchApplicationComponent } from './search/components/search/search.component';
import type { SettingsApplicationComponent } from './settings/components/settings/settings.component';
import type { SettingsAccountComponent } from './settings/components/account/account.component';
import type { SettingsDevicesComponent } from './settings/components/devices/devices.component';
import type { SettingsPrivacyComponent } from './settings/components/privacy/privacy.component';
import type { SettingsRecoveryQuestionsComponent } from './settings/components/recovery-questions/recovery-questions.component';
import type { SettingsInvitesComponent } from './settings/components/invites/invites.component';
import type { SettingsChangePasswordComponent } from './settings/components/change-password/change-password.component';
import type { ProfileApplicationComponent } from './profile/components/profile/profile.component';
import type { UserProfileApplicationComponent } from './profile/components/user-profile/user-profile.component';
import type { NewDeviceApplicationComponent } from './new-device/components/new-device/new-device.component';

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
      {
        path: 'recovery',
        loadComponent: async (): Promise<typeof RecoveryApplicationComponent> => {
          const m = await import('./auth/components/recovery/recovery.component');
          return m.RecoveryApplicationComponent;
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

  // Экран нового устройства — осиротевшие собеседники
  {
    path: 'new-device',
    loadComponent: async (): Promise<typeof NewDeviceApplicationComponent> => {
      const m = await import('./new-device/components/new-device/new-device.component');
      return m.NewDeviceApplicationComponent;
    },
  },

  // Профиль чужого пользователя — полноэкранный, без таббара
  {
    path: 'main/user/:accountId',
    canActivate: [authGuard],
    loadComponent: async (): Promise<typeof UserProfileApplicationComponent> => {
      const m = await import('./profile/components/user-profile/user-profile.component');
      return m.UserProfileApplicationComponent;
    },
  },

  // Подэкраны Settings — полноэкранные, без таббара
  {
    path: 'main/settings/account',
    canActivate: [authGuard],
    loadComponent: async (): Promise<typeof SettingsAccountComponent> => {
      const m = await import('./settings/components/account/account.component');
      return m.SettingsAccountComponent;
    },
  },
  {
    path: 'main/settings/devices',
    canActivate: [authGuard],
    loadComponent: async (): Promise<typeof SettingsDevicesComponent> => {
      const m = await import('./settings/components/devices/devices.component');
      return m.SettingsDevicesComponent;
    },
  },
  {
    path: 'main/settings/privacy',
    canActivate: [authGuard],
    loadComponent: async (): Promise<typeof SettingsPrivacyComponent> => {
      const m = await import('./settings/components/privacy/privacy.component');
      return m.SettingsPrivacyComponent;
    },
  },
  {
    path: 'main/settings/recovery',
    canActivate: [authGuard],
    loadComponent: async (): Promise<typeof SettingsRecoveryQuestionsComponent> => {
      const m = await import('./settings/components/recovery-questions/recovery-questions.component');
      return m.SettingsRecoveryQuestionsComponent;
    },
  },
  {
    path: 'main/settings/invites',
    canActivate: [authGuard],
    loadComponent: async (): Promise<typeof SettingsInvitesComponent> => {
      const m = await import('./settings/components/invites/invites.component');
      return m.SettingsInvitesComponent;
    },
  },
  {
    path: 'main/settings/change-password',
    canActivate: [authGuard],
    loadComponent: async (): Promise<typeof SettingsChangePasswordComponent> => {
      const m = await import('./settings/components/change-password/change-password.component');
      return m.SettingsChangePasswordComponent;
    },
  },

  // Основное приложение (мессенджер): shell с таббаром
  {
    path: 'main',
    canActivate: [authGuard],
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
        path: 'chats/:chatId',
        loadComponent: async (): Promise<typeof ChatDetailApplicationComponent> => {
          const m = await import('./chats/components/chat-detail/chat-detail.component');
          return m.ChatDetailApplicationComponent;
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
