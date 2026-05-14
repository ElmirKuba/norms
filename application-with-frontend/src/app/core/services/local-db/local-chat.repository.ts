import { inject, Injectable } from '@angular/core';

import { LocalDbService } from './local-db.service';
import type { LocalChat, LocalChatKey, LocalChatWithPeer, LocalMessage, LocalMessageStatus, LocalChatStatus, LocalPeerDevice } from './local-db.types';

/* eslint-disable @typescript-eslint/naming-convention */
/** Строка из таблицы chat_keys. */
interface RawChatKey {
  /** ID чата. */
  readonly chat_id: string;
  /** Зашифрованный ключ (base64). */
  readonly encrypted_key: string;
  /** IV шифрования (base64). */
  readonly key_iv: string;
  /** Unix-время создания (мс). */
  readonly created_at: number;
}

/** Строка из JOIN chats + peer_devices. */
interface RawChatWithPeer {
  /** ID чата. */
  readonly id: string;
  /** Название чата. */
  readonly name: string;
  /** Статус чата. */
  readonly status: LocalChatStatus;
  /** ID сессии собеседника. */
  readonly peer_session_id: string;
  /** Unix-время создания (мс). */
  readonly created_at: number;
  /** Unix-время обновления (мс). */
  readonly updated_at: number;
  /** session_id из peer_devices или null. */
  readonly pd_session_id: string | null;
  /** account_id из peer_devices или null. */
  readonly pd_account_id: string | null;
  /** UIN из peer_devices или null. */
  readonly pd_uin: string | null;
  /** nickname из peer_devices или null. */
  readonly pd_nickname: string | null;
  /** username из peer_devices или null. */
  readonly pd_username: string | null;
  /** system_name из peer_devices или null. */
  readonly pd_system_name: string | null;
  /** device_nickname из peer_devices или null. */
  readonly pd_device_nickname: string | null;
}

/** Строка из таблицы messages. */
interface RawMessage {
  /** ID сообщения. */
  readonly id: string;
  /** ID чата. */
  readonly chat_id: string;
  /** ID сессии отправителя. */
  readonly sender_session_id: string;
  /** Текст сообщения. */
  readonly content: string;
  /** Статус доставки. */
  readonly status: LocalMessageStatus;
  /** 1 — исходящее, 0 — входящее. */
  readonly is_outgoing: number;
  /** Unix-время создания (мс). */
  readonly created_at: number;
}

/** Строка из таблицы peer_devices. */
interface RawPeerDevice {
  /** ID сессии устройства. */
  readonly session_id: string;
  /** ID аккаунта собеседника. */
  readonly account_id: string;
  /** UIN или null. */
  readonly uin: string | null;
  /** Никнейм или null. */
  readonly nickname: string | null;
  /** Username или null. */
  readonly username: string | null;
  /** Системное имя устройства. */
  readonly system_name: string;
  /** Прозвище устройства или null. */
  readonly device_nickname: string | null;
}
/* eslint-enable @typescript-eslint/naming-convention */

const CHAT_JOIN_SELECT = `
  SELECT
    c.id, c.name, c.status, c.peer_session_id, c.created_at, c.updated_at,
    pd.session_id   AS pd_session_id,
    pd.account_id   AS pd_account_id,
    pd.uin          AS pd_uin,
    pd.nickname     AS pd_nickname,
    pd.username     AS pd_username,
    pd.system_name  AS pd_system_name,
    pd.device_nickname AS pd_device_nickname
  FROM chats c
  LEFT JOIN peer_devices pd ON pd.session_id = c.peer_session_id
`;

/**
 * Маппинг сырой JOIN-строки в LocalChatWithPeer.
 * @param row - Сырая строка из БД.
 * @returns LocalChatWithPeer.
 */
function mapChat(row: RawChatWithPeer): LocalChatWithPeer {
  const peer: LocalPeerDevice | null =
    row.pd_session_id !== null && row.pd_account_id !== null && row.pd_system_name !== null
      ? {
          sessionId: row.pd_session_id,
          accountId: row.pd_account_id,
          uin: row.pd_uin,
          nickname: row.pd_nickname,
          username: row.pd_username,
          systemName: row.pd_system_name,
          deviceNickname: row.pd_device_nickname,
        }
      : null;

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    peerSessionId: row.peer_session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    peer,
  };
}

/**
 * Маппинг сырой строки сообщения в LocalMessage.
 * @param row - Сырая строка из БД.
 * @returns LocalMessage.
 */
function mapMessage(row: RawMessage): LocalMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderSessionId: row.sender_session_id,
    content: row.content,
    status: row.status,
    isOutgoing: row.is_outgoing === 1,
    createdAt: row.created_at,
  };
}

/**
 * Маппинг сырой строки peer_devices в LocalPeerDevice.
 * @param row - Сырая строка из БД.
 * @returns LocalPeerDevice.
 */
function mapPeerDevice(row: RawPeerDevice): LocalPeerDevice {
  return {
    sessionId: row.session_id,
    accountId: row.account_id,
    uin: row.uin,
    nickname: row.nickname,
    username: row.username,
    systemName: row.system_name,
    deviceNickname: row.device_nickname,
  };
}

/**
 * CRUD над таблицами chats, messages, peer_devices в локальной SQLite.
 */
@Injectable({ providedIn: 'root' })
export class LocalChatRepository {
  /** LocalDbService для работы с SQLite. */
  private readonly _db: LocalDbService = inject(LocalDbService);

  /**
   * Возвращает все чаты с данными собеседника, сортировка по updated_at DESC.
   * @returns Массив чатов с данными собеседника.
   */
  public async getChats(): Promise<readonly LocalChatWithPeer[]> {
    const rows = await this._db.all<RawChatWithPeer>(
      `${CHAT_JOIN_SELECT} ORDER BY c.updated_at DESC`,
    );
    return rows.map(mapChat);
  }

  /**
   * Возвращает чат по ID или null если не найден.
   * @param id - ID чата.
   * @returns Чат с данными собеседника или null.
   */
  public async getChat(id: string): Promise<LocalChatWithPeer | null> {
    const row = await this._db.get<RawChatWithPeer>(
      `${CHAT_JOIN_SELECT} WHERE c.id = ?`,
      [id],
    );
    return row !== undefined ? mapChat(row) : null;
  }

  /**
   * Вставляет или заменяет запись чата.
   * @param chat - Данные чата.
   */
  public async upsertChat(chat: LocalChat): Promise<void> {
    await this._db.run(
      `INSERT OR REPLACE INTO chats (id, name, status, peer_session_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [chat.id, chat.name, chat.status, chat.peerSessionId, chat.createdAt, chat.updatedAt],
    );
  }

  /**
   * Обновляет статус чата и timestamp.
   * @param id - ID чата.
   * @param status - Новый статус.
   */
  public async updateChatStatus(id: string, status: LocalChatStatus): Promise<void> {
    await this._db.run(
      `UPDATE chats SET status = ?, updated_at = ? WHERE id = ?`,
      [status, Date.now(), id],
    );
  }

  /**
   * Удаляет чат и каскадно — все его сообщения.
   * @param id - ID чата.
   */
  public async deleteChat(id: string): Promise<void> {
    await this._db.run(`DELETE FROM chats WHERE id = ?`, [id]);
  }

  /**
   * Возвращает все сообщения чата, сортировка по created_at ASC.
   * @param chatId - ID чата.
   * @returns Массив сообщений.
   */
  public async getMessages(chatId: string): Promise<readonly LocalMessage[]> {
    const rows = await this._db.all<RawMessage>(
      `SELECT id, chat_id, sender_session_id, content, status, is_outgoing, created_at
       FROM messages
       WHERE chat_id = ?
       ORDER BY created_at ASC`,
      [chatId],
    );
    return rows.map(mapMessage);
  }

  /**
   * Вставляет или заменяет сообщение.
   * @param message - Данные сообщения.
   */
  public async saveMessage(message: LocalMessage): Promise<void> {
    await this._db.run(
      `INSERT OR REPLACE INTO messages (id, chat_id, sender_session_id, content, status, is_outgoing, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.chatId,
        message.senderSessionId,
        message.content,
        message.status,
        message.isOutgoing ? 1 : 0,
        message.createdAt,
      ],
    );
  }

  /**
   * Обновляет статус сообщения.
   * @param id - ID сообщения.
   * @param status - Новый статус.
   */
  public async updateMessageStatus(id: string, status: LocalMessageStatus): Promise<void> {
    await this._db.run(`UPDATE messages SET status = ? WHERE id = ?`, [status, id]);
  }

  /**
   * Вставляет или обновляет запись об устройстве собеседника.
   * @param device - Данные устройства.
   */
  public async upsertPeerDevice(device: LocalPeerDevice): Promise<void> {
    await this._db.run(
      `INSERT OR REPLACE INTO peer_devices
         (session_id, account_id, uin, nickname, username, system_name, device_nickname)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        device.sessionId,
        device.accountId,
        device.uin,
        device.nickname,
        device.username,
        device.systemName,
        device.deviceNickname,
      ],
    );
  }

  /**
   * Возвращает устройство собеседника по session_id или null если не найдено.
   * @param sessionId - ID сессии.
   * @returns LocalPeerDevice или null.
   */
  public async getPeerDevice(sessionId: string): Promise<LocalPeerDevice | null> {
    const row = await this._db.get<RawPeerDevice>(
      `SELECT session_id, account_id, uin, nickname, username, system_name, device_nickname
       FROM peer_devices
       WHERE session_id = ?`,
      [sessionId],
    );
    return row !== undefined ? mapPeerDevice(row) : null;
  }

  /**
   * Вставляет или заменяет ключ чата.
   * @param key - Данные ключа.
   */
  public async saveChatKey(key: LocalChatKey): Promise<void> {
    await this._db.run(
      `INSERT OR REPLACE INTO chat_keys (chat_id, encrypted_key, key_iv, created_at)
       VALUES (?, ?, ?, ?)`,
      [key.chatId, key.encryptedKey, key.keyIv, key.createdAt],
    );
  }

  /**
   * Возвращает ключ чата или null если не найден.
   * @param chatId - ID чата.
   * @returns LocalChatKey или null.
   */
  public async getChatKey(chatId: string): Promise<LocalChatKey | null> {
    const row = await this._db.get<RawChatKey>(
      `SELECT chat_id, encrypted_key, key_iv, created_at FROM chat_keys WHERE chat_id = ?`,
      [chatId],
    );
    if (row === undefined) return null;
    return {
      chatId: row.chat_id,
      encryptedKey: row.encrypted_key,
      keyIv: row.key_iv,
      createdAt: row.created_at,
    };
  }

  /**
   * Удаляет ключ чата.
   * @param chatId - ID чата.
   */
  public async deleteChatKey(chatId: string): Promise<void> {
    await this._db.run(`DELETE FROM chat_keys WHERE chat_id = ?`, [chatId]);
  }
}
