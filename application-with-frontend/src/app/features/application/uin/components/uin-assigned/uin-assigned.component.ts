import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';

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
  protected _copied: boolean = false;

  /** Форматированный UIN для отображения: «8845» → «8 845» */
  protected get _formattedUin(): string {
    return this._uin.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
  }

  /** Роутер для навигации между экранами */
  private readonly _router: Router = inject(Router);

  /** Change detector для принудительного обновления при OnPush (Promise-коллбэк вне zone.js). */
  private readonly _cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  public constructor() {
    const state = window.history.state as Record<string, unknown>;
    const uin = state['uin'];
    this._uin = typeof uin === 'string' ? uin : '';
  }

  /** Скопировать UIN в буфер обмена */
  public onCopy(): void {
    // TODO: заменить на ClipboardService (платформенный сервис)
    this._copied = true;
    this._cdr.detectChanges();
    void navigator.clipboard.writeText(this._uin);
    setTimeout((): void => {
      this._copied = false;
      this._cdr.detectChanges();
    }, 1500);
  }

  /** Продолжить — переход на основной экран приложения */
  public onContinue(): void {
    void this._router.navigate(['/application/main']);
  }
}
