import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
  private readonly _router: Router = inject(Router);
  private readonly _dialog: MatDialog = inject(MatDialog);

  /** Список устройств (мок) */
  public readonly devices = signal<DeviceItem[]>(
    MOCK_DEVICES.map((d) => ({ ...d })),
  );

  /** id устройства, для которого открыто поле переименования */
  public readonly renamingId = signal<string | null>(null);

  /** Временное имя при редактировании */
  public renameValue: string = '';

  /** Назад к настройкам */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }

  /** Открыть подтверждение кика */
  public confirmTerminate(device: DeviceItem): void {
    this._dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
      ...MODAL_BOTTOM_SHEET_PARAMS,
      data: {
        icon: ModalHeaderIcon.Warning,
        title: 'Отключить устройство?',
        text: `«${device.name}» будет отключено. Сессия завершится, все незавершённые действия — прерваны.`,
        isConfirmModal: true,
        confirmBtnText: 'Отключить',
        cancelBtnText: 'Отмена',
        isFooterButtonsVertically: true,
        confirmCallback: () => { this._terminateDevice(device.id); },
      },
    });
  }

  /** Открыть поле переименования */
  public openRename(device: DeviceItem): void {
    this.renameValue = device.name;
    this.renamingId.set(device.id);
  }

  /** Сохранить переименование */
  public saveRename(id: string): void {
    const trimmed = this.renameValue.trim();
    if (trimmed) {
      this.devices.update((list) =>
        list.map((d) => (d.id === id ? { ...d, name: trimmed } : d)),
      );
    }
    this.renamingId.set(null);
  }

  /** Отменить переименование */
  public cancelRename(): void {
    this.renamingId.set(null);
  }

  private _terminateDevice(id: string): void {
    this.devices.update((list) => list.filter((d) => d.id !== id));
  }
}
