import { ChangeDetectionStrategy, Component, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MOCK_SEARCH_USERS } from '../../types/search.types';
import { ChatOnboardingService } from '../../../chats/services/chat-onboarding.service';
import type { MockSearchUser } from '../../types/search.types';
import type { Signal } from '@angular/core';

/** Экран поиска по UIN или username */
@Component({
  imports: [FormsModule],
  selector: 'application-search',
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchApplicationComponent {
  private readonly _router: Router = inject(Router);
  private readonly _onboarding: ChatOnboardingService = inject(ChatOnboardingService);

  /** Поисковый запрос */
  public readonly query = signal<string>('');

  /** Отфильтрованные результаты */
  public readonly results: Signal<MockSearchUser[]> = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    return MOCK_SEARCH_USERS.filter(
      (u) => u.name.toLowerCase().includes(q) || u.uin.includes(q),
    );
  });

  /** Обновить запрос из input */
  public onQueryChange(value: string): void {
    this.query.set(value);
  }

  /** Открыть профиль пользователя */
  public openProfile(user: MockSearchUser): void {
    void this._router.navigate(['/application/main/user', user.id]);
  }

  /** Написать пользователю — онбординг + переход к чату (мок) */
  public writeToUser(user: MockSearchUser): void {
    this._onboarding.openIfNeeded(() => {
      // В реальном приложении: создать чат через API, затем перейти в него
      // Мок: переходим на профиль пользователя
      void this._router.navigate(['/application/main/user', user.id]);
    });
  }
}
