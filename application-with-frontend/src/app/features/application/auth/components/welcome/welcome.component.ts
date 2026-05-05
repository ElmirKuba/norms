import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';
import type { FeatureFlags } from '../../types/auth.types';
import { MOCK_FEATURE_FLAGS } from '../../types/auth.types';
import { ThemeService } from '../../../../../core/services/theme/theme.service';

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

  /** Роутер для навигации между экранами */
  private readonly _router: Router = inject(Router);

  /** Сервис управления цветовой темой */
  private readonly _themeService: ThemeService = inject(ThemeService);

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

  /** Переключает цветовую тему интерфейса */
  public toggleTheme(): void {
    this._themeService.toggle();
  }
}
