import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
  public readonly submitState: WritableSignal<'idle' | 'loading' | 'success' | 'error'> = signal('idle');

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

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

  /** Отправить (мок) */
  public submit(): void {
    if (!this.isFormValid) return;

    this.submitState.set('loading');

    // Мок: через 1.2 с — успех
    setTimeout((): void => {
      this.submitState.set('success');
    }, 1200);
  }
}
