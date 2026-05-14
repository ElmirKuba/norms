import { inject, Injectable } from '@angular/core';

import { LocalDbService } from './local-db.service';
import type { LocalChat, LocalChatKey, LocalChatKeyRatchetUpdate, LocalChatWithPeer, LocalMessage, LocalMessageStatus, LocalChatStatus, LocalPeerDevice } from './local-db.types';

/* eslint-disable @typescript-eslint/naming-convention */
/** Строка из таблицы chat_keys. */
interface RawChatKey {
  /** ID чата. */
  readonly chat_id: string;
  /** Зашифрованный AES-ключ (base64). Пустая строка в pending_key фазе. */
  readonly encrypted_key: string;
  /** IV AES-ключа (base64). Пустая строка в pending_key фазе. */
  readonly key_iv: string;
  /** Зашифрованный ECDH приватный ключ (base64). null после обмена. */
  readonly encrypted_priv_key: string | null;
  /** IV ECDH приватного ключа (base64). null после обмена. */
  readonly priv_key_iv: string | null;
  /** Предыдущий AES-ключ (base64). Пустая строка если нет. */
  readonly prev_encrypted_key: string;
  /** IV предыдущего AES-ключа (base64). */
  readonly prev_key_iv: string;
  /** Рачет-приватный ключ (base64, wrapped). null до первой генерации. */
  readonly my_ratchet_encrypted_priv_key: string | null;
  /** IV рачет-приватного ключа (base64). null если my_ratchet_encrypted_priv_key = null. */
  readonly my_ratchet_priv_key_iv: string | null;
  /** Рачет-публичный ключ (base64). null до первой генерации. */
  readonly my_ratchet_pub_key: string | null;
  /** Последний полученный рачет-публичный ключ собеседника (base64). null до первого входящего. */
  readonly peer_ratchet_pub_key: string | null;
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
   * Вставляет или заменяет запись ключей чата.
   * В pending_key фазе: encryptedKey/keyIv = '', encryptedPrivKey/privKeyIv — зашифрованный ECDH ключ.
   * После обмена: encryptedKey/keyIv — AES-ключ, encryptedPrivKey/privKeyIv = null, рачет-поля заполнены.
   * @param key - Данные ключей.
   */
  public async saveChatKey(key: LocalChatKey): Promise<void> {
    await this._db.run(
      `INSERT OR REPLACE INTO chat_keys (
         chat_id, encrypted_key, key_iv, encrypted_priv_key, priv_key_iv,
         prev_encrypted_key, prev_key_iv,
         my_ratchet_encrypted_priv_key, my_ratchet_priv_key_iv, my_ratchet_pub_key,
         peer_ratchet_pub_key, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        key.chatId,
        key.encryptedKey,
        key.keyIv,
        key.encryptedPrivKey,
        key.privKeyIv,
        key.prevEncryptedKey,
        key.prevKeyIv,
        key.myRatchetEncryptedPrivKey,
        key.myRatchetPrivKeyIv,
        key.myRatchetPubKey,
        key.peerRatchetPubKey,
        key.createdAt,
      ],
    );
  }

  /**
   * Атомарно обновляет рачет-состояние chat_keys после DH-шага.
   * Меняет AES-ключ, сохраняет предыдущий, обновляет рачет-пару и peer_ratchet_pub_key.
   * @param chatId - ID чата.
   * @param update - Новые значения рачет-полей.
   */
  public async updateChatKeyRatchet(chatId: string, update: LocalChatKeyRatchetUpdate): Promise<void> {
    await this._db.run(
      `UPDATE chat_keys SET
         encrypted_key = ?,
         key_iv = ?,
         prev_encrypted_key = ?,
         prev_key_iv = ?,
         my_ratchet_encrypted_priv_key = ?,
         my_ratchet_priv_key_iv = ?,
         my_ratchet_pub_key = ?,
         peer_ratchet_pub_key = ?
       WHERE chat_id = ?`,
      [
        update.encryptedKey,
        update.keyIv,
        update.prevEncryptedKey,
        update.prevKeyIv,
        update.myRatchetEncryptedPrivKey,
        update.myRatchetPrivKeyIv,
        update.myRatchetPubKey,
        update.peerRatchetPubKey,
        chatId,
      ],
    );
  }

  /**
   * Возвращает запись ключей чата или null если не найдена.
   * @param chatId - ID чата.
   * @returns LocalChatKey или null.
   */
  public async getChatKey(chatId: string): Promise<LocalChatKey | null> {
    const row = await this._db.get<RawChatKey>(
      `SELECT
         chat_id, encrypted_key, key_iv, encrypted_priv_key, priv_key_iv,
         prev_encrypted_key, prev_key_iv,
         my_ratchet_encrypted_priv_key, my_ratchet_priv_key_iv,
         my_ratchet_pub_key, peer_ratchet_pub_key, created_at
       FROM chat_keys WHERE chat_id = ?`,
      [chatId],
    );
    if (row === undefined) return null;
    return {
      chatId: row.chat_id,
      encryptedKey: row.encrypted_key,
      keyIv: row.key_iv,
      encryptedPrivKey: row.encrypted_priv_key,
      privKeyIv: row.priv_key_iv,
      prevEncryptedKey: row.prev_encrypted_key,
      prevKeyIv: row.prev_key_iv,
      myRatchetEncryptedPrivKey: row.my_ratchet_encrypted_priv_key,
      myRatchetPrivKeyIv: row.my_ratchet_priv_key_iv,
      myRatchetPubKey: row.my_ratchet_pub_key,
      peerRatchetPubKey: row.peer_ratchet_pub_key,
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
