import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { MatDialogRef } from '@angular/material/dialog';
import { DialogModalComponent } from '../../../../shared/modals/components/dialog-modal/dialog-modal.component';
import type { DialogModalData } from '../../../../shared/modals/types/modal.types';
import { ModalHeaderIcon } from '../../../../shared/modals/types/modal.types';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../shared/modals/constants/modal.constants';

/** Модальные окна UIN-флоу */
@Injectable({ providedIn: 'root' })
export class UinModalService {
  /** Сервис диалогов Angular Material */
  private readonly _dialog: MatDialog = inject(MatDialog);

  /**
   * Открывает bottom-sheet «Назначаем UIN...».
   * Закрывается при нажатии «Понятно» (колбек onAcknowledge) или
   * программно из WSS-обработчика при получении события uin_assigned.
   * @param onAcknowledge - колбек при нажатии кнопки «Понятно»
   * @returns ссылка на открытый диалог
   */
  public openUinPending(onAcknowledge: () => void): MatDialogRef<DialogModalComponent> {
    return this._dialog.open<DialogModalComponent, DialogModalData>(
      DialogModalComponent,
      {
        ...MODAL_BOTTOM_SHEET_PARAMS,
        data: {
          icon: ModalHeaderIcon.PRELOADER,
          title: 'Назначаем UIN...',
          text: 'Это займёт несколько секунд. Пожалуйста, подождите.',
          closeBtnText: 'Понятно',
          closeCallback: onAcknowledge,
        },
      },
    );
  }
}
