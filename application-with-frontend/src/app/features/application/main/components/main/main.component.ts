import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { UinModalService } from '../../../uin/services/uin-modal.service';
import { ChatsStateService } from '../../../chats/services/chats-state.service';
import { WssService } from '../../../../../core/services/wss/wss.service';
import { SessionApiService } from '../../../../../core/services/session/session-api.service';

/** Данные новой сессии для баннера подтверждения входа. */
interface NewSessionAlert {
  /** ID новой сессии (для кика). */
  readonly sessionId: string;
  /** Системное имя устройства. */
  readonly systemName: string;
  /** Платформа (electron / ios / android / web). */
  readonly platform: string;
}

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

  /**
   * Баннер смены пароля с другого устройства (WSS password_changed).
   * true — показать баннер безопасности.
   */
  public readonly passwordChangedBanner: WritableSignal<boolean> = signal(false);

  /**
   * Баннер нового входа (WSS session_created).
   * null — не показывать. Иначе содержит данные для кика.
   */
  public readonly newSessionAlert: WritableSignal<NewSessionAlert | null> = signal(null);

  /** Роутер для навигации и чтения navigation state */
  private readonly _router: Router = inject(Router);

  /** Сервис модалок UIN-флоу */
  private readonly _uinModal: UinModalService = inject(UinModalService);

  /** Сервис состояния чатов */
  private readonly _chatsState: ChatsStateService = inject(ChatsStateService);

  /** WSS-сервис для подписки на real-time события */
  private readonly _wss: WssService = inject(WssService);

  /** HTTP-клиент для операций с сессиями */
  private readonly _sessionApi: SessionApiService = inject(SessionApiService);

  public constructor() {
    this._wss.passwordResetAt$
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.passwordResetBanner.set(true);
      });

    this._wss.passwordChangedAt$
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.passwordChangedBanner.set(true);
      });

    this._wss.sessionCreated$
      .pipe(takeUntilDestroyed())
      .subscribe((alert: NewSessionAlert): void => {
        this.newSessionAlert.set(alert);
      });
  }

  /** @inheritdoc */
  public ngOnInit(): void {
    const state = this._router.lastSuccessfulNavigation()?.extras.state as Record<string, unknown> | null | undefined;
    if (state?.['pendingUin'] === true) {
      this._uinModal.showPendingAndWait();
    }
  }

  /** Закрыть баннер сброса пароля */
  public dismissPasswordResetBanner(): void {
    this.passwordResetBanner.set(false);
  }

  /** Закрыть баннер смены пароля с другого устройства */
  public dismissPasswordChangedBanner(): void {
    this.passwordChangedBanner.set(false);
  }

  /** Кикнуть новую сессию и закрыть баннер */
  public kickNewSession(): void {
    const alert = this.newSessionAlert();
    if (alert === null) return;
    this.newSessionAlert.set(null);
    this._sessionApi.deleteById(alert.sessionId).subscribe();
  }

  /** Закрыть баннер нового входа без кика */
  public dismissNewSessionAlert(): void {
    this.newSessionAlert.set(null);
  }
}
