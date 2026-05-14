import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';

/** Результат подтверждения доставки — для WSS-пуша отправителю. */
export interface MessageDeliveredResult {
  /** ID сообщения. */
  readonly messageId: string;
  /** ID чата. */
  readonly chatId: string;
  /** ID сессии-отправителя (кому слать message_delivered). */
  readonly senderSessionId: string;
}

/** Use-case подтверждения доставки: удаляет blob, возвращает данные для пуша отправителю. */
@Injectable()
export class MessageDeliveredUseCase {
  public constructor(private readonly _chatRepo: ChatRepository) {}

  /**
   * Проверяет права, удаляет pending_message, возвращает данные для уведомления отправителя.
   * @param receiverSessionId - ID сессии-получателя (из JWT).
   * @param messageId - ID сообщения из client event.
   * @returns Данные для WSS message_delivered отправителю.
   */
  public async execute(receiverSessionId: string, messageId: string): Promise<MessageDeliveredResult> {
    const msg = await this._chatRepo.findPendingMessageById(messageId);
    if (msg === null) {
      throw new NotFoundException(makeError(ErrorCode.MESSAGE_NOT_FOUND));
    }

    if (msg.receiverSessionId !== receiverSessionId) {
      throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_MESSAGE));
    }

    await this._chatRepo.deletePendingMessageById(messageId);

    return {
      messageId,
      chatId: msg.chatId,
      senderSessionId: msg.senderSessionId,
    };
  }
}
