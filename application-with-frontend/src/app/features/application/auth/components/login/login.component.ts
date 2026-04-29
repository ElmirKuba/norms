import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { InputSharedComponent } from '../../../../../shared/components/input/input.component';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';

/** Экран входа в аккаунт */
@Component({
  imports: [InputSharedComponent, ButtonSharedComponent],
  selector: 'application-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginApplicationComponent {
  /** Логин: UIN (цифры) или username */
  protected readonly _login: WritableSignal<string> = signal('');

  /** Пароль */
  protected readonly _password: WritableSignal<string> = signal('');

  /** Кнопка активна когда оба поля заполнены */
  protected get _isValid(): boolean {
    return this._login().trim().length > 0 && this._password().length >= 8;
  }

  /** Роутер для навигации между экранами */
  private readonly _router: Router = inject(Router);

  /** Вход (мок: переходим на main) */
  public onSubmit(): void {
    if (!this._isValid) return;
    // TODO: вызвать API POST /api/v1/account/auth
    void this._router.navigate(['/application/main']);
  }

  /** Переход на экран восстановления пароля */
  public onForgotPassword(): void {
    // TODO: реализовать recovery flow
    void this._router.navigate(['/application/auth/recovery']);
  }
}
