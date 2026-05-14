import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatOnboardingService } from '../../../chats/services/chat-onboarding.service';
import { CreateChatModalService } from '../../../chats/services/create-chat-modal.service';
import { AuthApiService } from '../../../auth/services/auth-api.service';
import type { ReadOtherAccountResponse } from '../../../auth/services/auth-api.service';
import { avatarColorForId } from '../../../search/services/search-api.service';

/** Отображаемые данные чужого профиля. */
interface UserProfileDisplay {
  /** ID аккаунта. */
  readonly accountId: string;
  /** Отображаемое имя: nickname > @username > UIN > Аккаунт. */
  readonly displayName: string;
  /** UIN или null. */
  readonly uin: string | null;
  /** Никнейм или null. */
  readonly nickname: string | null;
  /** Username или null. */
  readonly username: string | null;
  /** Инициалы для аватара (до 2 символов). */
  readonly initials: string;
  /** Цвет аватара. */
  readonly avatarColor: string;
}

/**
 * Строит отображаемые данные из ответа API.
 * @param data - Данные аккаунта от бэка.
 * @returns Отображаемые поля.
 */
function buildDisplay(data: ReadOtherAccountResponse): UserProfileDisplay {
  let displayName: string;
  let initials: string;

  if (data.nickname !== null) {
    displayName = data.nickname;
    const words = data.nickname.trim().split(/\s+/);
    const first = words[0]?.[0]?.toUpperCase() ?? '?';
    const second = words[1]?.[0]?.toUpperCase() ?? '';
    initials = first + second;
  } else if (data.username !== null) {
    displayName = `@${data.username}`;
    initials = data.username[0]?.toUpperCase() ?? '?';
  } else if (data.uin !== null) {
    displayName = `UIN ${data.uin}`;
    initials = data.uin[0] ?? '?';
  } else {
    displayName = 'Аккаунт';
    initials = '?';
  }

  return {
    accountId: data.id,
    displayName,
    uin: data.uin,
    nickname: data.nickname,
    username: data.username,
    initials,
    avatarColor: avatarColorForId(data.id),
  };
}

/** Профиль чужого пользователя */
@Component({
  imports: [],
  selector: 'application-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileApplicationComponent implements OnInit {
  /** Отображаемые данные профиля. */
  public readonly profile: WritableSignal<UserProfileDisplay | null> = signal(null);

  /** Идёт загрузка. */
  public readonly loading: WritableSignal<boolean> = signal(true);

  /** Сервис навигации назад в истории браузера. */
  private readonly _location: Location = inject(Location);

  /** Маршрут для чтения параметров. */
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);

  /** Роутер для навигации. */
  private readonly _router: Router = inject(Router);

  /** Сервис онбординг-модалки. */
  private readonly _onboarding: ChatOnboardingService = inject(ChatOnboardingService);

  /** Сервис открытия модалки создания чата. */
  private readonly _createChatModal: CreateChatModalService = inject(CreateChatModalService);

  /** API аккаунта. */
  private readonly _authApi: AuthApiService = inject(AuthApiService);

  /** @inheritdoc */
  public ngOnInit(): void {
    const accountId = this._route.snapshot.paramMap.get('accountId');
    if (accountId === null) {
      this.loading.set(false);
      return;
    }

    this._authApi.readAccount(accountId).subscribe({
      next: (data: ReadOtherAccountResponse): void => {
        this.profile.set(buildDisplay(data));
        this.loading.set(false);
      },
      error: (): void => {
        this.loading.set(false);
      },
    });
  }

  /** Назад — возвращаемся туда откуда пришли (поиск и т.п.) */
  public goBack(): void {
    this._location.back();
  }

  /** Написать — онбординг → выбор устройства → переход в чат */
  public writeMessage(): void {
    const currentProfile = this.profile();
    if (currentProfile === null) return;

    this._onboarding.openIfNeeded((): void => {
      this._createChatModal.open(
        {
          accountId: currentProfile.accountId,
          displayName: currentProfile.displayName,
          initials: currentProfile.initials,
          avatarColor: currentProfile.avatarColor,
          uin: currentProfile.uin,
          nickname: currentProfile.nickname,
          username: currentProfile.username,
        },
        (_chatId: string): void => {
          void this._router.navigate(['/application/main/chats']);
        },
      );
    });
  }
}
