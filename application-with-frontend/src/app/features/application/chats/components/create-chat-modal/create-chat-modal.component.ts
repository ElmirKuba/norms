import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { MockSearchUser, MockUserDevice } from '../../../search/types/search.types';

/** Данные, передаваемые в модалку выбора устройства */
export interface CreateChatModalData {
  readonly user: MockSearchUser;
}

/** Результат создания чата */
export interface CreateChatModalResult {
  readonly deviceId: string;
  readonly chatName: string;
}

/** Шаги модалки создания чата */
type CreateChatStep = 'device' | 'name';

/** Модалка создания чата: выбор устройства → ввод названия */
@Component({
  imports: [FormsModule],
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

  /** Текущий шаг модалки */
  public readonly step = signal<CreateChatStep>('device');

  /** Выбранное устройство */
  public readonly selectedDevice = signal<MockUserDevice | null>(null);

  /** Название чата */
  public chatName = '';

  /** Закрыть без результата */
  public close(): void {
    this._dialogRef.close();
  }

  /** Вернуться к выбору устройства */
  public goBack(): void {
    this.step.set('device');
    this.selectedDevice.set(null);
    this.chatName = '';
  }

  /** Выбрать устройство — переход к вводу названия */
  public selectDevice(device: MockUserDevice): void {
    this.selectedDevice.set(device);
    this.step.set('name');
  }

  /** Подтвердить создание чата */
  public confirmCreate(): void {
    const device = this.selectedDevice();
    const name = this.chatName.trim();
    if (!device || !name) return;
    this._dialogRef.close({ deviceId: device.deviceId, chatName: name });
  }
}
