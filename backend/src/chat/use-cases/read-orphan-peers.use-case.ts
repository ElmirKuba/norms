import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../../domain/ports/chat.repository.port';
import type { OrphanPeer } from '../../domain/entities/chat.entity';

/** Элемент ответа — осиротевший собеседник. */
interface OrphanPeerResponseItem {
  /** ID аккаунта собеседника. */
  readonly account_id: string;
  /** UIN или null. */
  readonly uin: string | null;
  /** Никнейм аккаунта или null. */
  readonly nickname: string | null;
  /** Username или null. */
  readonly username: string | null;
  /** ISO-8601 дата последнего чата с этим аккаунтом с других устройств. */
  readonly last_chat_at: string;
}

/** Use-case получения осиротевших собеседников для экрана нового устройства. */
@Injectable()
export class ReadOrphanPeersUseCase {
  public constructor(private readonly _chatRepo: ChatRepository) {}

  /**
   * Возвращает аккаунты с чатами на других устройствах, но без чатов на текущем.
   * @param myAccountId - ID текущего аккаунта (из JWT sub).
   * @param mySessionId - ID текущей сессии (из JWT sessionId).
   * @returns Список осиротевших собеседников, last_chat_at DESC.
   */
  public async execute(myAccountId: string, mySessionId: string): Promise<OrphanPeerResponseItem[]> {
    const peers = await this._chatRepo.findOrphanPeers(myAccountId, mySessionId);

    return peers.map((peer: OrphanPeer): OrphanPeerResponseItem => ({
      account_id: peer.accountId,
      uin: peer.uin,
      nickname: peer.nickname,
      username: peer.username,
      last_chat_at: peer.lastChatAt.toISOString(),
    }));
  }
}
