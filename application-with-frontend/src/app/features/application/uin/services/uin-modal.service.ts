import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import type { MatDialogRef } from '@angular/material/dialog';
import { DialogModalComponent } from '../../../../shared/modals/components/dialog-modal/dialog-modal.component';
import type { DialogModalData } from '../../../../shared/modals/types/modal.types';
import { ModalHeaderIcon } from '../../../../shared/modals/types/modal.types';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../shared/modals/constants/modal.constants';
import { UinApiService } from './uin-api.service';
import type { UinStatusResponse } from './uin-api.service';

/** Управляет модальными окнами UIN-флоу. */
@Injectable({ providedIn: 'root' })
export class UinModalService {
  /** Сервис диалогов Angular Material. */
  private readonly _dialog: MatDialog = inject(MatDialog);

  /** Роутер для навигации на экран UIN Assigned. */
  private readonly _router: Router = inject(Router);

  /** API-сервис для проверки статуса UIN. */
  private readonly _uinApi: UinApiService = inject(UinApiService);

  /** Ссылка на открытый pending-диалог — нужна для закрытия по WSS-событию uin_assigned. */
  private _pendingRef: MatDialogRef<DialogModalComponent> | null = null;

  /**
   * Открывает bottom-sheet «Назначаем UIN...» и управляет полным флоу:
   * при нажатии «Понятно» проверяет статус через API и либо открывает
   * assigned-модалку, либо ожидает WSS-события uin_assigned.
   */
  public showPendingAndWait(): void {
    this._pendingRef = this._dialog.open<DialogModalComponent, DialogModalData>(
      DialogModalComponent,
      {
        ...MODAL_BOTTOM_SHEET_PARAMS,
        data: {
          icon: ModalHeaderIcon.PRELOADER,
          title: 'Назначаем UIN...',
          text: 'Это займёт несколько секунд. Пожалуйста, подождите.',
          closeBtnText: 'Понятно',
          closeCallback: (): void => {
            this._onPendingAcknowledged();
          },
          preventDialogClose: true,
        },
      },
    );
  }

  /**
   * Закрывает pending-модалку и открывает assigned-модалку с полученным UIN.
   * Вызывается из WssService при получении события uin_assigned.
   * @param uin - Присвоенный UIN.
   */
  public closePendingAndShowAssigned(uin: string): void {
    this._pendingRef?.close();
    this._pendingRef = null;
    this._openUinAssigned(uin);
  }

  /**
   * Вызывается когда пользователь нажал «Понятно» в pending-модалке.
   * Запрашивает актуальный статус UIN через API.
   */
  private _onPendingAcknowledged(): void {
    this._uinApi.readStatus().subscribe({
      next: (response: UinStatusResponse): void => {
        if (response.status === 'assigned' && response.uin !== null) {
          this._openUinAssigned(response.uin);
        }
        // Если status === 'pending' — ждём WSS-события uin_assigned
      },
      error: (): void => {
        // Сеть недоступна — WSS-событие uin_assigned покажет модалку когда придёт
      },
    });
  }

  /**
   * Навигирует на полноэкранный экран UIN Assigned с UIN в router state.
   * @param uin - Присвоенный UIN.
   */
  private _openUinAssigned(uin: string): void {
    void this._router.navigate(['/application/uin/assigned'], { state: { uin } });
  }
}
