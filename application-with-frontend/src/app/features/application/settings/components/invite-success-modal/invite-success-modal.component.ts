import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ClipboardService } from '../../../../../core/services/clipboard/clipboard.service';

/** Данные модалки успешного создания инвайта */
export interface InviteSuccessModalData {
  /** Строка созданного инвайт-кода */
  readonly code: string;
}

/** Модалка: инвайт создан — большой код + «Скопировать» */
@Component({
  imports: [],
  selector: 'application-invite-success-modal',
  templateUrl: './invite-success-modal.component.html',
  styleUrl: './invite-success-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteSuccessModalComponent {
  /** Данные из диалога */
  public readonly data: InviteSuccessModalData = inject<InviteSuccessModalData>(MAT_DIALOG_DATA);

  /** Скопирован? */
  public readonly copied: WritableSignal<boolean> = signal(false);

  /** Ссылка на диалог для программного закрытия */
  private readonly _dialogRef: MatDialogRef<InviteSuccessModalComponent> =
    inject<MatDialogRef<InviteSuccessModalComponent>>(MatDialogRef);

  /** Сервис буфера обмена. */
  private readonly _clipboard: ClipboardService = inject(ClipboardService);

  /** Закрыть */
  public close(): void {
    this._dialogRef.close();
  }

  /** Скопировать код */
  public copyCode(): void {
    void this._clipboard.write(this.data.code).then((): void => {
      this.copied.set(true);
      setTimeout((): void => { this.copied.set(false); }, 1500);
    });
  }
}
