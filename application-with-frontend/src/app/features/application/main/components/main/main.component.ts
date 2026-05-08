import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { UinModalService } from '../../../uin/services/uin-modal.service';
import { ChatsStateService } from '../../../chats/services/chats-state.service';
import { SessionKickedService } from '../../services/session-kicked.service';
import { WssService } from '../../../../../core/services/wss/wss.service';

/** Основной shell приложения: таббар + router-outlet для дочерних экранов */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'application-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainApplicationComponent implements OnInit {
  /** Ссылка для таба «Чаты»: открытый чат или список */
  public readonly chatsTabLink: Signal<string[]> = computed((): string[] => {
    const chatId = this._chatsState.activeChatId();
    return chatId !== null
      ? ['/application/main/chats', chatId]
      : ['/application/main/chats'];
  });

  /**
   * Баннер сброса пароля (WSS password_reset_via_recovery).
   * true — показать баннер. В продакшне управляется WSS-событием.
   */
  public readonly passwordResetBanner: WritableSignal<boolean> = signal(false);

  /** Роутер для навигации и чтения navigation state */
  private readonly _router: Router = inject(Router);

  /** Сервис модалок UIN-флоу */
  private readonly _uinModal: UinModalService = inject(UinModalService);

  /** Сервис состояния чатов */
  private readonly _chatsState: ChatsStateService = inject(ChatsStateService);

  /** Сервис модалки кика сессии */
  private readonly _sessionKicked: SessionKickedService = inject(SessionKickedService);

  /** WSS-сервис для подписки на real-time события */
  private readonly _wss: WssService = inject(WssService);

  public constructor() {
    this._wss.passwordResetAt$
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.passwordResetBanner.set(true);
      });
  }

  /** @inheritdoc */
  public ngOnInit(): void {
    const state = this._router.lastSuccessfulNavigation()?.extras.state as Record<string, unknown> | null | undefined;
    if (state?.['pendingUin'] === true) {
      this._uinModal.showPendingAndWait();
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
