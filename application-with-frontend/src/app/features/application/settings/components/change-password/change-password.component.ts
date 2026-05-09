import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountApiService } from '../../services/account-api.service';

/** Подэкран настроек — Смена пароля */
@Component({
  imports: [FormsModule],
  selector: 'application-settings-change-password',
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsChangePasswordComponent {
  /** Текущий пароль */
  public currentPassword: string = '';

  /** Новый пароль */
  public newPassword: string = '';

  /** Подтверждение нового пароля */
  public confirmPassword: string = '';

  /** Показать текущий пароль */
  public readonly showCurrent: WritableSignal<boolean> = signal(false);

  /** Показать новый пароль */
  public readonly showNew: WritableSignal<boolean> = signal(false);

  /** Показать подтверждение */
  public readonly showConfirm: WritableSignal<boolean> = signal(false);

  /** Статус отправки */
  public readonly submitState: WritableSignal<'idle' | 'loading' | 'success'> = signal('idle');

  /** Сообщение об ошибке (null — нет ошибки). */
  public readonly errorMessage: WritableSignal<string | null> = signal(null);

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** API для обновления аккаунта */
  private readonly _accountApi: AccountApiService = inject(AccountApiService);

  /** Проверка: форма заполнена корректно */
  public get isFormValid(): boolean {
    return (
      this.currentPassword.length >= 8 &&
      this.newPassword.length >= 8 &&
      this.confirmPassword === this.newPassword
    );
  }

  /** Назад к аккаунту */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings/account']);
  }

  /** Отправить форму смены пароля. */
  public submit(): void {
    if (!this.isFormValid) return;

    this.submitState.set('loading');
    this.errorMessage.set(null);

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case API fields */
    this._accountApi.updateAccount({
      current_password: this.currentPassword,
      new_password: this.newPassword,
    /* eslint-enable @typescript-eslint/naming-convention */
    }).subscribe({
      next: (): void => {
        this.submitState.set('success');
      },
      error: (err: HttpErrorResponse): void => {
        this.submitState.set('idle');
        if (err.status === 401) {
          this.errorMessage.set('Неверный текущий пароль');
        } else {
          this.errorMessage.set('Ошибка при смене пароля. Попробуйте ещё раз.');
        }
      },
    });
  }
}
