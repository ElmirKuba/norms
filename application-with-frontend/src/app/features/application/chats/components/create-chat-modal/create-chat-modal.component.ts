import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { MockSearchUser, MockUserDevice } from '../../../search/types/search.types';

/** Данные, передаваемые в модалку выбора устройства */
export interface CreateChatModalData {
  readonly user: MockSearchUser;
}

/** Результат выбора устройства */
export interface CreateChatModalResult {
  readonly deviceId: string;
}

/** Модалка выбора устройства собеседника при создании чата */
@Component({
  imports: [],
  selector: 'application-create-chat-modal',
  templateUrl: './create-chat-modal.component.html',
  styleUrl: './create-chat-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateChatModalComponent {
  private readonly _dialogRef: MatDialogRef<CreateChatModalComponent, CreateChatModalResult> =
    inject(MatDialogRef);

  /** Данные из диалога */
  public readonly data: CreateChatModalData = inject<CreateChatModalData>(MAT_DIALOG_DATA);

  /** Закрыть без результата */
  public close(): void {
    this._dialogRef.close();
  }

  /** Выбрать устройство */
  public selectDevice(device: MockUserDevice): void {
    this._dialogRef.close({ deviceId: device.deviceId });
  }
}
