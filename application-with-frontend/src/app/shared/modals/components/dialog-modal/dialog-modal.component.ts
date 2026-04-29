import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { DialogModalData } from '../../types/modal.types';
import { ModalHeaderSharedComponent } from '../modal-header/modal-header.component';
import { ModalContentSharedComponent } from '../modal-content/modal-content.component';
import { ModalFooterSharedComponent } from '../modal-footer/modal-footer.component';
import { ButtonSharedComponent } from '../../../components/button/button.component';

/**
 * Универсальная рамка модального окна.
 * Конфигурируется через DialogModalData<T>, переданный в MAT_DIALOG_DATA.
 * Используется для 80% модалок (Способ A).
 *
 * Намеренно ChangeDetectionStrategy.Default — колбеки из data могут
 * менять внешнее состояние без Angular-сигналов.
 */
@Component({
  selector: 'shared-dialog-modal',
  imports: [
    NgComponentOutlet,
    ModalHeaderSharedComponent,
    ModalContentSharedComponent,
    ModalFooterSharedComponent,
    ButtonSharedComponent,
  ],
  templateUrl: './dialog-modal.component.html',
  styleUrl: './dialog-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class DialogModalComponent<T = unknown> implements OnInit {
  /** Данные конфигурации диалога */
  public readonly data: DialogModalData<T> = inject<DialogModalData<T>>(MAT_DIALOG_DATA);

  /** Ссылка на диалог для программного закрытия */
  private readonly _dialogRef: MatDialogRef<DialogModalComponent<T>> = inject(MatDialogRef);

  /** @inheritdoc */
  public ngOnInit(): void {
    if (this.data.preventDialogClose) {
      this._dialogRef.disableClose = true;
    }
  }

  /** Нажатие кнопки подтверждения (sync или async) */
  public async onConfirm(): Promise<void> {
    if (this.data.confirmCallbackAsync) {
      await this.data.confirmCallbackAsync();
    } else {
      this.data.confirmCallback?.();
      this._dialogRef.close(true);
    }
  }

  /** Нажатие кнопки отмены (sync или async) */
  public async onCancel(): Promise<void> {
    if (this.data.cancelCallbackAsync) {
      await this.data.cancelCallbackAsync();
    } else {
      this.data.cancelCallback?.();
      this._dialogRef.close(false);
    }
  }

  /** Нажатие кнопки закрытия */
  public onClose(): void {
    this.data.closeCallback?.();
    this._dialogRef.close();
  }

  /** Проверяет, заблокирована ли кнопка подтверждения */
  public isConfirmDisabled(): boolean {
    return this.data.isConfirmButtonDisabled ? this.data.isConfirmButtonDisabled() : false;
  }
}
