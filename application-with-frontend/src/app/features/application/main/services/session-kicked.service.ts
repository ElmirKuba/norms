import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogModalComponent } from '../../../../shared/modals/components/dialog-modal/dialog-modal.component';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../shared/modals/constants/modal.constants';
import { ModalHeaderIcon } from '../../../../shared/modals/types/modal.types';
import type { DialogModalData } from '../../../../shared/modals/types/modal.types';

/** Сервис глобального события «сессия завершена» (WSS session_kicked) */
@Injectable({ providedIn: 'root' })
export class SessionKickedService {
  private readonly _dialog: MatDialog = inject(MatDialog);
  private readonly _router: Router = inject(Router);

  /** Показать модалку кика и разлогинить пользователя */
  public showKickedModal(deviceName: string = 'другого устройства'): void {
    this._dialog.closeAll();

    this._dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
      ...MODAL_BOTTOM_SHEET_PARAMS,
      disableClose: true,
      data: {
        icon: ModalHeaderIcon.Warning,
        title: 'Сессия завершена',
        text: `Ваш аккаунт был отключён с устройства «${deviceName}». Войдите заново.`,
        closeBtnText: 'Войти заново',
        closeCallback: () => {
          void this._router.navigate(['/application/welcome']);
        },
        preventDialogClose: true,
      },
    });
  }
}
