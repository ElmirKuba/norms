import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseError } from 'pg';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import type { ChatEntity } from '../../domain/entities/chat.entity';

/** Имя unique index для пары устройств + название чата. */
const CHAT_PAIR_NAME_CONSTRAINT = 'chats_pair_name_unique';

/** PostgreSQL код нарушения уникальности. */
const PG_UNIQUE_VIOLATION = '23505';

/** Ответ на создание чата. */
interface CreateChatResponse {
  /** ID созданного чата. */
  readonly id: string;
  /** Название чата. */
  readonly name: string;
  /** ID сессии A (min из пары). */
  readonly session_a_id: string;
  /** ID сессии B (max из пары). */
  readonly session_b_id: string;
  /** Статус чата. */
  readonly status: string;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}

/** Use-case создания чата между двумя сессиями. */
@Injectable()
export class CreateChatUseCase {
  public constructor(
    private readonly _chatRepo: ChatRepository,
    private readonly _sessionRepo: SessionRepository,
  ) {}

  /**
   * Создаёт чат между текущей сессией и указанной сессией получателя.
   * @param mySessionId - ID текущей сессии (из JWT).
   * @param receiverSessionId - ID сессии получателя.
   * @param name - Название чата.
   * @returns Созданный чат.
   */
  public async execute(
    mySessionId: string,
    receiverSessionId: string,
    name: string,
  ): Promise<CreateChatResponse> {
    const receiverSession = await this._sessionRepo.findById(receiverSessionId);
    if (receiverSession === null) {
      throw new NotFoundException(makeError(ErrorCode.SESSION_NOT_FOUND));
    }

    const sessionAId = mySessionId < receiverSessionId ? mySessionId : receiverSessionId;
    const sessionBId = mySessionId < receiverSessionId ? receiverSessionId : mySessionId;

    let chat: ChatEntity;
    try {
      chat = await this._chatRepo.create({
        name,
        sessionAId,
        sessionBId,
        createdBySessionId: mySessionId,
        status: 'pending_key',
      });
    } catch (err: unknown) {
      if (
        err instanceof DatabaseError &&
        err.code === PG_UNIQUE_VIOLATION &&
        err.constraint === CHAT_PAIR_NAME_CONSTRAINT
      ) {
        throw new ConflictException(makeError(ErrorCode.CHAT_NAME_TAKEN));
      }
      throw err;
    }

    return {
      id: chat.id,
      name: chat.name,
      session_a_id: chat.sessionAId,
      session_b_id: chat.sessionBId,
      status: chat.status,
      created_at: chat.createdAt.toISOString(),
    };
  }
}
