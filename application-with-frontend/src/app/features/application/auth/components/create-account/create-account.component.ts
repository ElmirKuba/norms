import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { Router } from '@angular/router';
import { InputSharedComponent } from '../../../../../shared/components/input/input.component';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';

/** Экран создания аккаунта — ввод пароля */
@Component({
  imports: [InputSharedComponent, ButtonSharedComponent],
  selector: 'application-create-account',
  templateUrl: './create-account.component.html',
  styleUrl: './create-account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAccountApplicationComponent {
  /** Введённый пароль */
  protected readonly _password: WritableSignal<string> = signal('');

  /** Кнопка активна при минимум 8 символах (см. docs/identity.md) */
  protected get _isValid(): boolean {
    return this._password().length >= 8;
  }

  public constructor(private readonly _router: Router) {}

  /** Создание аккаунта (мок: сразу переходим к UIN pending) */
  public onSubmit(): void {
    if (!this._isValid) return;
    // TODO: вызвать API POST /api/v1/account/create
    void this._router.navigate(['/application/uin/pending']);
  }
}
