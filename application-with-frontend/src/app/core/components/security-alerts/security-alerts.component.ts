import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { WssService } from '../../services/wss/wss.service';
import { SessionApiService } from '../../services/session/session-api.service';

/** Данные новой сессии для баннера подтверждения входа. */
interface NewSessionAlert {
  /** ID новой сессии (для кика). */
  readonly sessionId: string;
  /** Системное имя устройства. */
  readonly systemName: string;
  /** Платформа (electron / ios / android / web). */
  readonly platform: string;
}

/**
 * Глобальный оверлей безопасности: отображает баннеры для критических WSS-событий
 * (смена пароля, новый вход) поверх всех экранов приложения.
 * Размещается в RootComponent, чтобы работать на любом маршруте после авторизации.
 */
@Component({
  selector: 'security-alerts',
  imports: [RouterLink],
  templateUrl: './security-alerts.component.html',
  styleUrl: './security-alerts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityAlertsComponent {
  /** Баннер: пароль сброшен через Recovery (WSS password_reset_via_recovery). */
  public readonly passwordResetBanner: WritableSignal<boolean> = signal(false);

  /** Баннер: пароль изменён с другого устройства (WSS password_changed). */
  public readonly passwordChangedBanner: WritableSignal<boolean> = signal(false);

  /**
   * Баннер нового входа (WSS session_created).
   * null — не показывать; иначе содержит данные для кика.
   */
  public readonly newSessionAlert: WritableSignal<NewSessionAlert | null> = signal(null);

  /** WSS-сервис для подписки на события безопасности. */
  private readonly _wss: WssService = inject(WssService);

  /** HTTP-клиент для кика сессий. */
  private readonly _sessionApi: SessionApiService = inject(SessionApiService);

  public constructor() {
    this._wss.passwordResetAt$
      .pipe(takeUntilDestroyed())
      .subscribe((): void => { this.passwordResetBanner.set(true); });

    this._wss.passwordChangedAt$
      .pipe(takeUntilDestroyed())
      .subscribe((): void => { this.passwordChangedBanner.set(true); });

    this._wss.sessionCreated$
      .pipe(takeUntilDestroyed())
      .subscribe((alert: NewSessionAlert): void => { this.newSessionAlert.set(alert); });
  }

  /** Закрыть баннер сброса пароля через Recovery. */
  public dismissPasswordResetBanner(): void {
    this.passwordResetBanner.set(false);
  }

  /** Закрыть баннер смены пароля с другого устройства. */
  public dismissPasswordChangedBanner(): void {
    this.passwordChangedBanner.set(false);
  }

  /** Кикнуть новую сессию и закрыть баннер. */
  public kickNewSession(): void {
    const alert = this.newSessionAlert();
    if (alert === null) return;
    this.newSessionAlert.set(null);
    this._sessionApi.deleteById(alert.sessionId).subscribe();
  }

  /** Закрыть баннер нового входа без кика. */
  public dismissNewSessionAlert(): void {
    this.newSessionAlert.set(null);
  }
}
