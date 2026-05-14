import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';
import { ClipboardService } from '../../../../../core/services/clipboard/clipboard.service';

/** Экран успешного присвоения UIN */
@Component({
  imports: [ButtonSharedComponent],
  selector: 'application-uin-assigned',
  templateUrl: './uin-assigned.component.html',
  styleUrl: './uin-assigned.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UinAssignedApplicationComponent {
  /** UIN пользователя, полученный из router state */
  protected readonly _uin: string;

  /** true — UIN только что скопирован (показывает галочку 1.5 сек). */
  protected readonly _copied: WritableSignal<boolean> = signal(false);

  /** Форматированный UIN для отображения: «8845» → «8 845» */
  protected get _formattedUin(): string {
    return this._uin.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
  }

  /** Роутер для навигации между экранами */
  private readonly _router: Router = inject(Router);

  /** Сервис буфера обмена. */
  private readonly _clipboard: ClipboardService = inject(ClipboardService);

  public constructor() {
    const state = window.history.state as Record<string, unknown>;
    const uin = state['uin'];
    this._uin = typeof uin === 'string' ? uin : '';
  }

  /** Скопировать UIN в буфер обмена */
  public onCopy(): void {
    void this._clipboard.write(this._uin).then((): void => {
      this._copied.set(true);
      setTimeout((): void => { this._copied.set(false); }, 1500);
    });
  }

  /** Продолжить — переход на основной экран приложения */
  public onContinue(): void {
    void this._router.navigate(['/application/main']);
  }
}
