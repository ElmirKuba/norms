import { ChangeDetectionStrategy, Component, computed, signal, inject } from '@angular/core';
import type { WritableSignal, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MOCK_SEARCH_USERS } from '../../types/search.types';
import { ChatOnboardingService } from '../../../chats/services/chat-onboarding.service';
import type { MockSearchUser } from '../../types/search.types';

/** Экран поиска по UIN или username */
@Component({
  imports: [FormsModule],
  selector: 'application-search',
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchApplicationComponent {
  /** Поисковый запрос */
  public readonly query: WritableSignal<string> = signal('');

  /** Отфильтрованные результаты */
  public readonly results: Signal<MockSearchUser[]> = computed((): MockSearchUser[] => {
    const q = this.query().trim().toLowerCase();
    if (q === '') return [];
    return MOCK_SEARCH_USERS.filter(
      (u: MockSearchUser): boolean => u.name.toLowerCase().includes(q) || u.uin.includes(q),
    );
  });

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** Сервис онбординг-модалки */
  private readonly _onboarding: ChatOnboardingService = inject(ChatOnboardingService);

  /**
   * Обновить запрос из input.
   * @param value - новое значение строки поиска
   */
  public onQueryChange(value: string): void {
    this.query.set(value);
  }

  /**
   * Открыть профиль пользователя.
   * @param user - пользователь из результатов поиска
   */
  public openProfile(user: MockSearchUser): void {
    void this._router.navigate(['/application/main/user', user.id]);
  }

  /**
   * Написать пользователю — онбординг + переход к чату (мок).
   * @param user - пользователь, которому пишем
   */
  public writeToUser(user: MockSearchUser): void {
    this._onboarding.openIfNeeded((): void => {
      // В реальном приложении: создать чат через API, затем перейти в него
      // Мок: переходим на профиль пользователя
      void this._router.navigate(['/application/main/user', user.id]);
    });
  }
}
