import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

/** Данные модалки успешного создания инвайта */
export interface InviteSuccessModalData {
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
  private readonly _dialogRef: MatDialogRef<InviteSuccessModalComponent> = inject(MatDialogRef);

  /** Данные из диалога */
  public readonly data: InviteSuccessModalData = inject<InviteSuccessModalData>(MAT_DIALOG_DATA);

  /** Скопирован? */
  public readonly copied = signal<boolean>(false);

  /** Закрыть */
  public close(): void {
    this._dialogRef.close();
  }

  /** Скопировать код */
  public copyCode(): void {
    void navigator.clipboard.writeText(this.data.code).then(() => {
      this.copied.set(true);
      setTimeout(() => { this.copied.set(false); }, 1500);
    });
  }
}
