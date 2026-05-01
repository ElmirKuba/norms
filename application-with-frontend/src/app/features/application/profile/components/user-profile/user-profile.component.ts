import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatOnboardingService } from '../../../chats/services/chat-onboarding.service';
import { CreateChatModalService } from '../../../chats/services/create-chat-modal.service';
import { MOCK_CHATS } from '../../../chats/types/chats.types';
import { MOCK_SEARCH_USERS } from '../../../search/types/search.types';
import type { MockSearchUser } from '../../../search/types/search.types';

/** Профиль чужого пользователя */
@Component({
  imports: [],
  selector: 'application-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileApplicationComponent implements OnInit {
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);
  private readonly _router: Router = inject(Router);
  private readonly _onboarding: ChatOnboardingService = inject(ChatOnboardingService);
  private readonly _createChatModal: CreateChatModalService = inject(CreateChatModalService);

  /** Данные пользователя */
  public readonly user = signal<MockSearchUser | null>(null);

  /** @inheritdoc */
  public ngOnInit(): void {
    const accountId = this._route.snapshot.paramMap.get('accountId');
    const found = MOCK_SEARCH_USERS.find((u) => u.id === accountId) ?? null;
    this.user.set(found);
  }

  /** Назад */
  public goBack(): void {
    void this._router.navigate(['/application/main/search']);
  }

  /** Написать — онбординг → выбор устройства → переход в чат */
  public writeMessage(): void {
    const currentUser = this.user();
    if (!currentUser) return;

    this._onboarding.openIfNeeded(() => {
      this._createChatModal.open(currentUser, (deviceId) => {
        // Ищем существующий мок-чат или переходим в список
        const existingChat = MOCK_CHATS.find((c) => c.id.startsWith(currentUser.id.split('_')[0] ?? ''));
        if (existingChat) {
          void this._router.navigate(['/application/main/chats', existingChat.id]);
        } else {
          // Мок: просто открываем первый чат из списка если нет совпадения
          const firstChat = MOCK_CHATS[0];
          if (firstChat) {
            void this._router.navigate(['/application/main/chats', firstChat.id]);
          } else {
            void this._router.navigate(['/application/main/chats']);
          }
        }
      });
    });
  }
}
