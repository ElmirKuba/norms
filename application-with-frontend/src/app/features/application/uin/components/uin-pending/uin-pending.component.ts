import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { Router } from '@angular/router';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';

/**
 * Экран ожидания UIN.
 * В продакшене это bottom sheet поверх main-экрана, здесь — отдельный экран (мок).
 * Показывается сразу после регистрации до получения WSS-события uin_assigned.
 */
@Component({
  imports: [ButtonSharedComponent],
  selector: 'application-uin-pending',
  templateUrl: './uin-pending.component.html',
  styleUrl: './uin-pending.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UinPendingApplicationComponent {
  public constructor(private readonly _router: Router) {}

  /**
   * Мок: симулировать получение UIN и перейти на uin-assigned.
   * В продакшене переход будет по WSS-событию uin_assigned.
   */
  public onAcknowledge(): void {
    // TODO: убрать этот мок — переход должен происходить по WSS uin_assigned
    void this._router.navigate(['/application/uin/assigned']);
  }
}
