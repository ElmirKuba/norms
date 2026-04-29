import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { Router } from '@angular/router';
import { InputSharedComponent } from '../../../../../shared/components/input/input.component';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';

/** Экран ввода инвайт-кода (шаг 1 регистрации) */
@Component({
  imports: [InputSharedComponent, ButtonSharedComponent],
  selector: 'application-invite-code',
  templateUrl: './invite-code.component.html',
  styleUrl: './invite-code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteCodeApplicationComponent {
  /** Введённый код (без форматирования) */
  protected readonly _rawCode: WritableSignal<string> = signal('');

  /** Отформатированное значение инпута (XXXX-XXXX-XX) */
  protected get _formattedCode(): string {
    return this._rawCode();
  }

  /** Кнопка активна когда введено 10 цифр */
  protected get _isValid(): boolean {
    return this._rawCode().replace(/\D/g, '').length === 10;
  }

  public constructor(private readonly _router: Router) {}

  /**
   * Обрабатывает ввод — оставляет только цифры, добавляет дефисы
   * @param value - введённое значение из инпута
   */
  public onInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    if (digits.length > 8) formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    this._rawCode.set(formatted);
  }

  /** Проверка кода (мок: любой 10-значный код проходит) */
  public onSubmit(): void {
    if (!this._isValid) return;
    // TODO: вызвать API POST /api/v1/account/create с invite_code
    void this._router.navigate(['/application/auth/create-account']);
  }
}
