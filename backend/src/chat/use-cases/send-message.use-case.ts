import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';

/** Максимальный размер blob в байтах (1MB). */
const MAX_BLOB_BYTES = 1_048_576;

/** Результат отправки сообщения — передаётся в WSS-гейтвей для рассылки событий. */
export interface SendMessageResult {
  /** ID созданного сообщения (pending_messages.id). */
  readonly messageId: string;
  /** ID чата. */
  readonly chatId: string;
  /** ID сессии-получателя (для push message_new). */
  readonly receiverSessionId: string;
  /** Base64-строка blob — pass-through для push получателю. */
  readonly encryptedBlobBase64: string;
}

/** Use-case сохранения исходящего сообщения и подготовки данных для WSS-пуша. */
@Injectable()
export class SendMessageUseCase {
  public constructor(private readonly _chatRepo: ChatRepository) {}

  /**
   * Валидирует blob, проверяет права, сохраняет в pending_messages.
   * @param senderSessionId - ID сессии-отправителя (из JWT).
   * @param chatId - ID чата.
   * @param encryptedBlobBase64 - Зашифрованный blob в base64.
   * @returns Данные для отправки WSS-событий отправителю и получателю.
   */
  public async execute(
    senderSessionId: string,
    chatId: string,
    encryptedBlobBase64: string,
  ): Promise<SendMessageResult> {
    if (encryptedBlobBase64.length === 0) {
      throw new BadRequestException(makeError(ErrorCode.INVALID_BLOB));
    }

    let blobBuffer: Buffer;
    try {
      blobBuffer = Buffer.from(encryptedBlobBase64, 'base64');
      if (blobBuffer.length === 0) throw new Error();
    } catch {
      throw new BadRequestException(makeError(ErrorCode.INVALID_BLOB));
    }

    if (blobBuffer.length > MAX_BLOB_BYTES) {
      throw new BadRequestException(makeError(ErrorCode.BLOB_TOO_LARGE));
    }

    const chat = await this._chatRepo.findById(chatId);
    if (chat === null) {
      throw new NotFoundException(makeError(ErrorCode.CHAT_NOT_FOUND));
    }

    const isParticipant = chat.sessionAId === senderSessionId || chat.sessionBId === senderSessionId;
    if (!isParticipant) {
      throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_CHAT));
    }

    const receiverSessionId = chat.sessionAId === senderSessionId ? chat.sessionBId : chat.sessionAId;

    const msg = await this._chatRepo.createPendingMessage({
      chatId,
      senderSessionId,
      receiverSessionId,
      encryptedBlob: blobBuffer,
    });

    return {
      messageId: msg.id,
      chatId,
      receiverSessionId,
      encryptedBlobBase64,
    };
  }
}
