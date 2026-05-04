import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatOnboardingService } from '../../../chats/services/chat-onboarding.service';
import { CreateChatModalService } from '../../../chats/services/create-chat-modal.service';
import { MOCK_CHATS } from '../../../chats/types/chats.types';
import { MOCK_SEARCH_USERS } from '../../../search/types/search.types';
import type { MockSearchUser } from '../../../search/types/search.types';
import type { MockChat } from '../../../chats/types/chats.types';

/** Профиль чужого пользователя */
@Component({
  imports: [],
  selector: 'application-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileApplicationComponent implements OnInit {
  /** Данные пользователя */
  public readonly user: WritableSignal<MockSearchUser | null> = signal(null);

  /** Сервис навигации назад в истории браузера */
  private readonly _location: Location = inject(Location);

  /** Маршрут для чтения параметров */
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** Сервис онбординг-модалки */
  private readonly _onboarding: ChatOnboardingService = inject(ChatOnboardingService);

  /** Сервис открытия модалки создания чата */
  private readonly _createChatModal: CreateChatModalService = inject(CreateChatModalService);

  /** @inheritdoc */
  public ngOnInit(): void {
    const accountId = this._route.snapshot.paramMap.get('accountId');
    const found = MOCK_SEARCH_USERS.find((u: MockSearchUser): boolean => u.id === accountId) ?? null;
    this.user.set(found);
  }

  /** Назад — возвращаемся туда откуда пришли (чат или поиск) */
  public goBack(): void {
    this._location.back();
  }

  /** Написать — онбординг → выбор устройства → переход в чат */
  public writeMessage(): void {
    const currentUser = this.user();
    if (currentUser === null) return;

    this._onboarding.openIfNeeded((): void => {
      this._createChatModal.open(currentUser, (_deviceId: string, _chatName: string): void => {
        // Мок: ищем существующий чат или открываем список
        const existingChat = MOCK_CHATS.find((c: MockChat): boolean => c.id.startsWith(currentUser.id.split('_')[0] ?? ''));
        if (existingChat !== undefined) {
          void this._router.navigate(['/application/main/chats', existingChat.id]);
        } else {
          const firstChat = MOCK_CHATS[0];
          if (firstChat !== undefined) {
            void this._router.navigate(['/application/main/chats', firstChat.id]);
          } else {
            void this._router.navigate(['/application/main/chats']);
          }
        }
      });
    });
  }
}
