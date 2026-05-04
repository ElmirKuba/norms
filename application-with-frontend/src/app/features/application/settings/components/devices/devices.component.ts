import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogModalComponent } from '../../../../../shared/modals/components/dialog-modal/dialog-modal.component';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../../shared/modals/constants/modal.constants';
import { ModalHeaderIcon } from '../../../../../shared/modals/types/modal.types';
import { MOCK_DEVICES } from '../../types/settings.types';
import type { MockDevice } from '../../types/settings.types';
import type { DialogModalData } from '../../../../../shared/modals/types/modal.types';

/** Устройство с изменяемым именем (мок) */
interface DeviceItem extends MockDevice {
  /** Отображаемое название (может быть изменено пользователем) */
  name: string;
}

/** Подэкран настроек — Устройства */
@Component({
  imports: [FormsModule],
  selector: 'application-settings-devices',
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDevicesComponent {
  /** Список устройств (мок) */
  public readonly devices: WritableSignal<DeviceItem[]> = signal(
    MOCK_DEVICES.map((d: MockDevice): DeviceItem => ({ ...d })),
  );

  /** id устройства, для которого открыто поле переименования */
  public readonly renamingId: WritableSignal<string | null> = signal(null);

  /** Временное имя при редактировании */
  public renameValue: string = '';

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** Сервис диалогов Angular Material */
  private readonly _dialog: MatDialog = inject(MatDialog);

  /** Назад к настройкам */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }

  /**
   * Открыть подтверждение кика.
   * @param device - устройство для отключения
   */
  public confirmTerminate(device: DeviceItem): void {
    this._dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
      ...MODAL_BOTTOM_SHEET_PARAMS,
      data: {
        icon: ModalHeaderIcon.WARNING,
        title: 'Отключить устройство?',
        text: `«${device.name}» будет отключено. Сессия завершится, все незавершённые действия — прерваны.`,
        isConfirmModal: true,
        confirmBtnText: 'Отключить',
        cancelBtnText: 'Отмена',
        isFooterButtonsVertically: true,
        confirmCallback: (): void => { this._terminateDevice(device.id); },
      },
    });
  }

  /**
   * Открыть поле переименования.
   * @param device - устройство для переименования
   */
  public openRename(device: DeviceItem): void {
    this.renameValue = device.name;
    this.renamingId.set(device.id);
  }

  /**
   * Сохранить переименование.
   * @param id - идентификатор устройства
   */
  public saveRename(id: string): void {
    const trimmed = this.renameValue.trim();
    if (trimmed.length > 0) {
      this.devices.update((list: DeviceItem[]): DeviceItem[] =>
        list.map((d: DeviceItem): DeviceItem => (d.id === id ? { ...d, name: trimmed } : d)),
      );
    }
    this.renamingId.set(null);
  }

  /** Отменить переименование */
  public cancelRename(): void {
    this.renamingId.set(null);
  }

  /**
   * Удалить устройство из списка (мок кика).
   * @param id - идентификатор устройства для удаления
   */
  private _terminateDevice(id: string): void {
    this.devices.update((list: DeviceItem[]): DeviceItem[] => list.filter((d: DeviceItem): boolean => d.id !== id));
  }
}
