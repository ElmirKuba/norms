import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InputSharedComponent } from '../../../../../shared/components/input/input.component';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';
import { InviteApiService } from '../../services/invite-api.service';

/** Экран ввода инвайт-кода (шаг 1 регистрации) */
@Component({
  imports: [InputSharedComponent, ButtonSharedComponent],
  selector: 'application-invite-code',
  templateUrl: './invite-code.component.html',
  styleUrl: './invite-code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteCodeApplicationComponent {
  /** Отображаемое значение инпута с дефисами (XXXX-XXXX-XX) */
  protected readonly _formattedCode: WritableSignal<string> = signal('');

  /** Текст ошибки от API или null */
  protected readonly _error: WritableSignal<string | null> = signal(null);

  /** Запрос в процессе выполнения */
  protected readonly _isLoading: WritableSignal<boolean> = signal(false);

  /** Кнопка активна когда введено 10 цифр и нет активного запроса */
  protected get _isValid(): boolean {
    return this._digits().length === 10 && !this._isLoading();
  }

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** API-сервис для проверки инвайт-кода */
  private readonly _inviteApi: InviteApiService = inject(InviteApiService);

  /**
   * Обрабатывает ввод — оставляет только цифры, добавляет дефисы
   * @param value - введённое значение из инпута
   */
  public onInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    if (digits.length > 8) formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    this._formattedCode.set(formatted);
    this._error.set(null);
  }

  /** Отправляет код на проверку и переходит к созданию аккаунта при успехе */
  public onSubmit(): void {
    const code = this._digits();
    if (code.length !== 10 || this._isLoading()) return;

    this._isLoading.set(true);
    this._error.set(null);

    this._inviteApi.checkCode(code).subscribe({
      next: (): void => {
        void this._router.navigate(['/application/auth/create-account'], {
          state: { inviteCode: code },
        });
      },
      error: (err: unknown): void => {
        this._isLoading.set(false);
        this._error.set(this._resolveError(err));
      },
    });
  }

  /**
   * Возвращает цифры без дефисов из текущего значения инпута.
   * @returns Строка из 0–10 цифр.
   */
  private _digits(): string {
    return this._formattedCode().replace(/-/g, '');
  }

  /**
   * Преобразует HTTP-ошибку в человекочитаемый текст.
   * @param err - Ошибка из subscribe.
   * @returns Текст ошибки для отображения.
   */
  private _resolveError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 429) return 'Слишком много попыток. Попробуйте позже.';
      if (err.status === 404) return 'Код не найден или уже истёк.';
    }
    return 'Что-то пошло не так. Попробуйте снова.';
  }
}
