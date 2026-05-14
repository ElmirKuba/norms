import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';

/** Результат обработки message_read — для WSS-пуша отправителю. */
export interface MessageReadResult {
  /** ID сообщения. */
  readonly messageId: string;
  /** ID чата. */
  readonly chatId: string;
  /** ID сессии-отправителя (кому слать message_read). */
  readonly senderSessionId: string;
}

/** Use-case relay message_read: проверяет участие в чате, возвращает сессию для пуша. */
@Injectable()
export class MessageReadUseCase {
  public constructor(private readonly _chatRepo: ChatRepository) {}

  /**
   * Проверяет что текущая сессия — участник чата, возвращает данные для пуша отправителю.
   * @param readerSessionId - ID сессии, прочитавшей сообщение (из JWT).
   * @param messageId - ID прочитанного сообщения.
   * @param chatId - ID чата (чтобы определить отправителя).
   * @returns Данные для WSS message_read отправителю.
   */
  public async execute(
    readerSessionId: string,
    messageId: string,
    chatId: string,
  ): Promise<MessageReadResult> {
    const chat = await this._chatRepo.findById(chatId);
    if (chat === null) {
      throw new NotFoundException(makeError(ErrorCode.CHAT_NOT_FOUND));
    }

    const isParticipant = chat.sessionAId === readerSessionId || chat.sessionBId === readerSessionId;
    if (!isParticipant) {
      throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_CHAT));
    }

    const senderSessionId = chat.sessionAId === readerSessionId ? chat.sessionBId : chat.sessionAId;

    return { messageId, chatId, senderSessionId };
  }
}
