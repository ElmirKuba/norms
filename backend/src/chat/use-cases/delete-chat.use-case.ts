import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';

/** Результат удаления чата — для WSS-пуша собеседнику. */
export interface DeleteChatResult {
  /** ID удалённого чата. */
  readonly chatId: string;
  /** ID сессии собеседника (кому слать chat_deleted). */
  readonly otherSessionId: string;
}

/** Use-case удаления чата: проверяет участие, удаляет, возвращает данные для WSS-пуша. */
@Injectable()
export class DeleteChatUseCase {
  public constructor(private readonly _chatRepo: ChatRepository) {}

  /**
   * Удаляет чат и возвращает сессию собеседника для WSS-уведомления.
   * @param sessionId - ID сессии инициатора удаления (из JWT).
   * @param chatId - ID удаляемого чата.
   * @returns Данные для WSS chat_deleted собеседнику.
   */
  public async execute(sessionId: string, chatId: string): Promise<DeleteChatResult> {
    const chat = await this._chatRepo.findById(chatId);
    if (chat === null) {
      throw new NotFoundException(makeError(ErrorCode.CHAT_NOT_FOUND));
    }

    const isParticipant = chat.sessionAId === sessionId || chat.sessionBId === sessionId;
    if (!isParticipant) {
      throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_CHAT));
    }

    await this._chatRepo.deleteById(chatId);

    const otherSessionId = chat.sessionAId === sessionId ? chat.sessionBId : chat.sessionAId;
    return { chatId, otherSessionId };
  }
}
