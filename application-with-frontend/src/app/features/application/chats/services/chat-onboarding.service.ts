import { Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogModalComponent } from '../../../../shared/modals/components/dialog-modal/dialog-modal.component';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../shared/modals/constants/modal.constants';
import type { MatDialogRef } from '@angular/material/dialog';
import type { DialogModalData } from '../../../../shared/modals/types/modal.types';

/** Сервис онбординг-модалки при создании первого чата */
@Injectable({ providedIn: 'root' })
export class ChatOnboardingService {
  private readonly _dialog: MatDialog = inject(MatDialog);

  /** Флаг: модалка уже была показана в этой сессии */
  private readonly _shown = signal<boolean>(false);

  /** Показать модалку, если ещё не показывалась. Вызывает onAcknowledge после закрытия. */
  public openIfNeeded(onAcknowledge: () => void): void {
    if (this._shown()) {
      onAcknowledge();
      return;
    }

    this._shown.set(true);
    const ref: MatDialogRef<DialogModalComponent> = this._dialog.open<DialogModalComponent, DialogModalData>(
      DialogModalComponent,
      {
        ...MODAL_BOTTOM_SHEET_PARAMS,
        data: {
          title: 'Как работают чаты в Нормисах',
          text: 'Каждый чат привязан к этому устройству. Если зайдёшь со второго устройства — этого чата там не будет.\n\nЧтобы общаться с тем же человеком с другого устройства, попроси его создать новый чат, выбрав нужное устройство в твоём профиле.\n\nЭто особенность сквозного шифрования: приватные ключи хранятся только здесь.',
          closeBtnText: 'Понятно',
          closeCallback: onAcknowledge,
        },
      },
    );
    // Если закрыли без кнопки (клик по backdrop) — всё равно выполняем callback
    ref.afterClosed().subscribe((result: unknown) => {
      if (result === undefined) onAcknowledge();
    });
  }
}
