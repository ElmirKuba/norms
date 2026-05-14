import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import type { ChatListItem } from '../../domain/entities/chat.entity';

/** Элемент ответа для списка чатов. */
interface ChatListResponseItem {
  /** ID чата. */
  readonly id: string;
  /** Название чата. */
  readonly name: string;
  /** Статус обмена ключами. */
  readonly status: string;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
  /** Данные сессии-собеседника. */
  readonly peer: {
    /** ID сессии собеседника. */
    readonly session_id: string;
    /** Системное имя устройства. */
    readonly system_name: string;
    /** Прозвище устройства или null. */
    readonly device_nickname: string | null;
    /** ID аккаунта собеседника. */
    readonly account_id: string;
    /** UIN или null. */
    readonly uin: string | null;
    /** Никнейм аккаунта или null. */
    readonly nickname: string | null;
    /** Username или null. */
    readonly username: string | null;
  };
}

/** Use-case получения списка чатов текущей сессии. */
@Injectable()
export class ReadChatListUseCase {
  public constructor(private readonly _chatRepo: ChatRepository) {}

  /**
   * Возвращает все чаты сессии с данными собеседника.
   * @param sessionId - ID текущей сессии из JWT.
   * @returns Список чатов, новые первые.
   */
  public async execute(sessionId: string): Promise<ChatListResponseItem[]> {
    const items = await this._chatRepo.findListBySessionId(sessionId);

    return items.map((item: ChatListItem): ChatListResponseItem => ({
      id: item.id,
      name: item.name,
      status: item.status,
      created_at: item.createdAt.toISOString(),
      peer: {
        session_id: item.peer.sessionId,
        system_name: item.peer.systemName,
        device_nickname: item.peer.deviceNickname,
        account_id: item.peer.accountId,
        uin: item.peer.uin,
        nickname: item.peer.nickname,
        username: item.peer.username,
      },
    }));
  }
}
