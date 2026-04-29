import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { Router } from '@angular/router';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';
import type { FeatureFlags } from '../../types/auth.types';
import { MOCK_FEATURE_FLAGS } from '../../types/auth.types';

/** Welcome-экран: стартовая точка входа в приложение */
@Component({
  imports: [ButtonSharedComponent],
  selector: 'application-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeApplicationComponent {
  /** Мок feature flags (заменить на сервис когда бэк будет готов) */
  protected readonly _flags: FeatureFlags = MOCK_FEATURE_FLAGS;

  public constructor(private readonly _router: Router) {}

  /** Переход на регистрацию: инвайт-код или сразу создание аккаунта */
  public onRegister(): void {
    if (this._flags.freeRegistration) {
      void this._router.navigate(['/application/auth/create-account']);
    } else {
      void this._router.navigate(['/application/auth/invite-code']);
    }
  }

  /** Переход на экран входа */
  public onLogin(): void {
    void this._router.navigate(['/application/auth/login']);
  }

  /** Переключение темы (TODO) */
  public toggleTheme(): void {
    // TODO: реализовать переключение темы
  }
}
