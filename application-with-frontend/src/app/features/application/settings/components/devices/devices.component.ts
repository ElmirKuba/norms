import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { OnInit, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogModalComponent } from '../../../../../shared/modals/components/dialog-modal/dialog-modal.component';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../../shared/modals/constants/modal.constants';
import { ModalHeaderIcon } from '../../../../../shared/modals/types/modal.types';
import type { DialogModalData } from '../../../../../shared/modals/types/modal.types';
import { SessionApiService } from '../../../../../core/services/session/session-api.service';
import type { ApiSession, ClearOthersResponse } from '../../../../../core/services/session/session-api.service';

/** Устройство, отображаемое в списке. */
interface DeviceItem {
  /** ID сессии. */
  id: string;
  /** Отображаемое имя: прозвище или системное имя. */
  name: string;
  /** Платформа для иконки. */
  platform: string;
  /** true — текущая сессия (нельзя кикнуть, можно переименовать). */
  isCurrent: boolean;
  /** Дата последней активности (отформатированная). */
  lastSeen: string;
}

/** Подэкран настроек — Устройства */
@Component({
  imports: [FormsModule],
  selector: 'application-settings-devices',
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDevicesComponent implements OnInit {
  /** Список устройств. */
  public readonly devices: WritableSignal<DeviceItem[]> = signal([]);

  /** ID устройства, для которого открыто поле переименования. */
  public readonly renamingId: WritableSignal<string | null> = signal(null);

  /** true — идёт загрузка списка устройств. */
  public readonly isLoading: WritableSignal<boolean> = signal(true);

  /** true — есть хотя бы одна чужая сессия (показывать кнопку «Завершить все»). */
  public readonly hasOtherDevices: Signal<boolean> = computed(
    (): boolean => this.devices().some((d: DeviceItem): boolean => !d.isCurrent),
  );

  /** Временное значение поля переименования. */
  public renameValue: string = '';

  /** Роутер для навигации. */
  private readonly _router: Router = inject(Router);

  /** Сервис диалогов Angular Material. */
  private readonly _dialog: MatDialog = inject(MatDialog);

  /** API-клиент для сессий. */
  private readonly _sessionApi: SessionApiService = inject(SessionApiService);

  /** @inheritdoc */
  public ngOnInit(): void {
    this._sessionApi.readList().subscribe({
      next: (sessions: ApiSession[]): void => {
        this.devices.set(sessions.map((s: ApiSession): DeviceItem => this._mapSession(s)));
        this.isLoading.set(false);
      },
      error: (): void => { this.isLoading.set(false); },
    });
  }

  /** Назад к настройкам. */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }

  /**
   * Открывает диалог подтверждения кика.
   * @param device - Устройство для отключения.
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
   * Открывает поле переименования (только для текущей сессии).
   * @param device - Устройство для переименования.
   */
  public openRename(device: DeviceItem): void {
    if (!device.isCurrent) return;
    this.renameValue = device.name;
    this.renamingId.set(device.id);
  }

  /**
   * Сохраняет новое прозвище текущей сессии через API.
   * @param id - ID сессии.
   */
  public saveRename(id: string): void {
    const trimmed = this.renameValue.trim();
    if (trimmed.length === 0) {
      this.renamingId.set(null);
      return;
    }
    this._sessionApi.updateNickname(trimmed).subscribe({
      next: (): void => {
        this.devices.update((list: DeviceItem[]): DeviceItem[] =>
          list.map((d: DeviceItem): DeviceItem => (d.id === id ? { ...d, name: trimmed } : d)),
        );
        this.renamingId.set(null);
      },
      error: (): void => { this.renamingId.set(null); },
    });
  }

  /** Отменяет переименование. */
  public cancelRename(): void {
    this.renamingId.set(null);
  }

  /** Открывает диалог подтверждения завершения всех остальных сессий. */
  public confirmClearOthers(): void {
    this._dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
      ...MODAL_BOTTOM_SHEET_PARAMS,
      data: {
        icon: ModalHeaderIcon.WARNING,
        title: 'Завершить все остальные сессии?',
        text: 'Все устройства, кроме текущего, будут отключены.',
        isConfirmModal: true,
        confirmBtnText: 'Завершить все',
        cancelBtnText: 'Отмена',
        isFooterButtonsVertically: true,
        confirmCallback: (): void => { this._clearOthers(); },
      },
    });
  }

  /**
   * Кикает сессию по ID через API и убирает её из списка.
   * @param id - ID сессии.
   */
  private _terminateDevice(id: string): void {
    this._sessionApi.deleteById(id).subscribe({
      next: (): void => {
        this.devices.update((list: DeviceItem[]): DeviceItem[] =>
          list.filter((d: DeviceItem): boolean => d.id !== id),
        );
      },
    });
  }

  /** Завершает все сессии, кроме текущей, и убирает их из списка. */
  private _clearOthers(): void {
    this._sessionApi.clearOthers().subscribe({
      next: (_res: ClearOthersResponse): void => {
        this.devices.update((list: DeviceItem[]): DeviceItem[] =>
          list.filter((d: DeviceItem): boolean => d.isCurrent),
        );
      },
    });
  }

  /**
   * Преобразует ApiSession в DeviceItem для отображения.
   * @param session - Сессия из API.
   * @returns Подготовленный объект устройства.
   */
  private _mapSession(session: ApiSession): DeviceItem {
    return {
      id: session.id,
      name: session.nickname ?? session.system_name,
      platform: session.platform,
      isCurrent: session.is_current,
      lastSeen: new Date(session.updated_at).toLocaleDateString('ru-RU'),
    };
  }
}
