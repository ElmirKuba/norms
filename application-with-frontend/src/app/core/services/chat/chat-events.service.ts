import { Injectable, inject } from '@angular/core';
import { WssService } from '../wss/wss.service';
import type { WssMessageNewData, WssMessageStatusData } from '../wss/wss.service';
import { LocalChatRepository } from '../local-db/local-chat.repository';
import type { LocalMessage } from '../local-db/local-db.types';

/**
 * Декодирует base64-blob в UTF-8 строку (phase 1 — plaintext).
 * @param blob - base64-строка.
 * @returns Текст сообщения или заглушка при ошибке декодирования.
 */
function base64ToText(blob: string): string {
  try {
    const binary = atob(blob);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) & 0xff;
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return '[не удалось расшифровать]';
  }
}

/**
 * Глобальный обработчик WSS-событий чата.
 * Активируется один раз при старте через init() в APP_INITIALIZER.
 * Сохраняет входящие сообщения в SQLite и подтверждает доставку серверу.
 */
@Injectable({ providedIn: 'root' })
export class ChatEventsService {
  /** WSS-сервис. */
  private readonly _wss: WssService = inject(WssService);

  /** Репозиторий локальной БД. */
  private readonly _chatRepo: LocalChatRepository = inject(LocalChatRepository);

  /**
   * Подписывается на WSS-события чата.
   * Вызывать один раз из APP_INITIALIZER после wss.connect().
   */
  public init(): void {
    this._wss.messageNew$.subscribe((data: WssMessageNewData): void => {
      void this._handleMessageNew(data);
    });
    this._wss.messageDelivered$.subscribe((data: WssMessageStatusData): void => {
      void this._chatRepo.updateMessageStatus(data.messageId, 'delivered');
    });
    this._wss.messageRead$.subscribe((data: WssMessageStatusData): void => {
      void this._chatRepo.updateMessageStatus(data.messageId, 'read');
    });
  }

  /**
   * Сохраняет входящее сообщение в SQLite и отправляет message_delivered серверу.
   * @param data - Данные события message_new.
   */
  private async _handleMessageNew(data: WssMessageNewData): Promise<void> {
    const content = base64ToText(data.encryptedBlob);

    const msg: LocalMessage = {
      id: data.messageId,
      chatId: data.chatId,
      senderSessionId: data.senderSessionId,
      content,
      status: 'delivered',
      isOutgoing: false,
      createdAt: Date.now(),
    };

    await this._chatRepo.saveMessage(msg);
    await this._chatRepo.updateChatStatus(data.chatId, 'active');

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    this._wss.send('message_delivered', {
      message_id: data.messageId,
      chat_id: data.chatId,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}
