import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { UinModalService } from '../../../uin/services/uin-modal.service';
import { ChatsStateService } from '../../../chats/services/chats-state.service';
import { SessionKickedService } from '../../services/session-kicked.service';
import type { Signal } from '@angular/core';

/** Основной shell приложения: таббар + router-outlet для дочерних экранов */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'application-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainApplicationComponent implements OnInit {
  private readonly _router: Router = inject(Router);
  private readonly _uinModal: UinModalService = inject(UinModalService);
  private readonly _chatsState: ChatsStateService = inject(ChatsStateService);
  private readonly _sessionKicked: SessionKickedService = inject(SessionKickedService);

  /** Ссылка для таба «Чаты»: открытый чат или список */
  public readonly chatsTabLink: Signal<string[]> = computed(() => {
    const chatId = this._chatsState.activeChatId();
    return chatId
      ? ['/application/main/chats', chatId]
      : ['/application/main/chats'];
  });

  /**
   * Баннер сброса пароля (WSS password_reset_via_recovery).
   * true — показать баннер. В продакшне управляется WSS-событием.
   */
  public readonly passwordResetBanner = signal<boolean>(false);

  /** @inheritdoc */
  public ngOnInit(): void {
    const state = this._router.lastSuccessfulNavigation()?.extras.state as Record<string, unknown> | null | undefined;
    if (state?.['pendingUin'] === true) {
      this._uinModal.openUinPending((): void => {
        void this._router.navigate(['/application/uin/assigned']);
      });
    }
    // Мок: симулируем password_reset_via_recovery из навигационного state
    if (state?.['mockPasswordReset'] === true) {
      this.passwordResetBanner.set(true);
    }
  }

  /** [МОК] Симулировать событие session_kicked */
  public mockSessionKick(): void {
    this._sessionKicked.showKickedModal('MacBook Pro');
  }

  /** Закрыть баннер сброса пароля */
  public dismissPasswordResetBanner(): void {
    this.passwordResetBanner.set(false);
  }

  /** [МОК] Показать баннер сброса пароля */
  public mockPasswordReset(): void {
    this.passwordResetBanner.set(true);
  }
}
