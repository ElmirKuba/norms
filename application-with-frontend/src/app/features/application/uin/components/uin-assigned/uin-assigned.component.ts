import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { Router } from '@angular/router';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';
import { MOCK_UIN } from '../../types/uin.types';

/** Экран успешного присвоения UIN */
@Component({
  imports: [ButtonSharedComponent],
  selector: 'application-uin-assigned',
  templateUrl: './uin-assigned.component.html',
  styleUrl: './uin-assigned.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UinAssignedApplicationComponent {
  /** UIN пользователя (мок, в продакшене придёт из WSS-события uin_assigned) */
  protected readonly _uin: string = MOCK_UIN;

  /** Форматированный UIN для отображения (4 291 837) */
  protected get _formattedUin(): string {
    return this._uin.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
  }

  public constructor(private readonly _router: Router) {}

  /** Скопировать UIN в буфер обмена */
  public async onCopy(): Promise<void> {
    // TODO: использовать ClipboardService (платформенный сервис)
    await navigator.clipboard.writeText(this._uin);
  }

  /** Продолжить — переход на основной экран приложения */
  public onContinue(): void {
    // TODO: перейти на main с учётом orphan-peers (devices-and-chats.md)
    void this._router.navigate(['/application/main']);
  }
}
