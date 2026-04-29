import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { InputSharedComponent } from '../../../../../shared/components/input/input.component';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';
import { UinModalService } from '../../../uin/services/uin-modal.service';

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

  /** Роутер для навигации между экранами */
  private readonly _router: Router = inject(Router);

  /** Сервис UIN-модалок */
  private readonly _uinModal: UinModalService = inject(UinModalService);

  /** Кнопка активна при минимум 8 символах (см. docs/identity.md) */
  protected get _isValid(): boolean {
    return this._password().length >= 8;
  }

  /** Создание аккаунта: открывает модалку ожидания UIN */
  public onSubmit(): void {
    if (!this._isValid) return;
    // TODO: вызвать API POST /api/v1/account/create, затем открыть модалку
    this._uinModal.openUinPending((): void => {
      void this._router.navigate(['/application/uin/assigned']);
    });
  }
}
