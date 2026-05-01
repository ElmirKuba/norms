import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../shared/modals/constants/modal.constants';
import {
  CreateChatModalComponent,
} from '../components/create-chat-modal/create-chat-modal.component';
import type { CreateChatModalData, CreateChatModalResult } from '../components/create-chat-modal/create-chat-modal.component';
import type { MockSearchUser } from '../../search/types/search.types';

/** Сервис открытия модалки выбора устройства при создании чата */
@Injectable({ providedIn: 'root' })
export class CreateChatModalService {
  private readonly _dialog: MatDialog = inject(MatDialog);

  /**
   * Открывает модалку создания чата (выбор устройства → название).
   * @param user — пользователь, которому пишем
   * @param onCreated — вызывается с deviceId и chatName после подтверждения
   */
  public open(user: MockSearchUser, onCreated: (deviceId: string, chatName: string) => void): void {
    const ref = this._dialog.open<
      CreateChatModalComponent,
      CreateChatModalData,
      CreateChatModalResult
    >(CreateChatModalComponent, {
      ...MODAL_BOTTOM_SHEET_PARAMS,
      data: { user },
    });

    ref.afterClosed().subscribe((result: CreateChatModalResult | undefined) => {
      if (result?.deviceId && result.chatName) {
        onCreated(result.deviceId, result.chatName);
      }
    });
  }
}
