import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import type { SubmitKeyResult } from '../../domain/entities/chat.entity';

/** Use-case загрузки публичного ECDH-ключа в чат. */
@Injectable()
export class SubmitChatKeyUseCase {
  public constructor(private readonly _chatRepo: ChatRepository) {}

  /**
   * Валидирует доступ и загружает публичный ключ в чат.
   * @param sessionId - ID текущей сессии.
   * @param chatId - ID чата.
   * @param publicKey - X25519 публичный ключ в base64.
   * @returns Результат обмена (exchangeComplete + peer info).
   */
  public async execute(sessionId: string, chatId: string, publicKey: string): Promise<SubmitKeyResult> {
    const chat = await this._chatRepo.findById(chatId);
    if (chat === null) throw new NotFoundException(makeError(ErrorCode.CHAT_NOT_FOUND));

    const isA = chat.sessionAId === sessionId;
    const isB = chat.sessionBId === sessionId;
    if (!isA && !isB) throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_CHAT));

    if (chat.status === 'active') throw new BadRequestException(makeError(ErrorCode.CHAT_ALREADY_ACTIVE));

    const myCurrentKey = isA ? chat.publicKeyA : chat.publicKeyB;
    if (myCurrentKey !== null) throw new BadRequestException(makeError(ErrorCode.CHAT_KEY_ALREADY_SUBMITTED));

    return this._chatRepo.submitKey(chatId, sessionId, publicKey);
  }
}
