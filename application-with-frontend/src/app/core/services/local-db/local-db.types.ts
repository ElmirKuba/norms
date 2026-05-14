/** Статус чата в локальной БД. */
export type LocalChatStatus = 'pending_key' | 'active' | 'is_dead';

/** Статус сообщения в локальной БД. */
export type LocalMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/** Чат из локальной SQLite. */
export interface LocalChat {
  /** ID чата (с сервера). */
  readonly id: string;
  /** Название чата. */
  readonly name: string;
  /** Статус чата. */
  readonly status: LocalChatStatus;
  /** ID сессии собеседника. */
  readonly peerSessionId: string;
  /** Unix-время создания (мс). */
  readonly createdAt: number;
  /** Unix-время последнего обновления (мс). */
  readonly updatedAt: number;
}

/** Устройство собеседника из локальной SQLite. */
export interface LocalPeerDevice {
  /** ID сессии устройства. */
  readonly sessionId: string;
  /** ID аккаунта собеседника. */
  readonly accountId: string;
  /** UIN или null если ещё не назначен. */
  readonly uin: string | null;
  /** Никнейм аккаунта или null. */
  readonly nickname: string | null;
  /** Username или null. */
  readonly username: string | null;
  /** Системное имя устройства. */
  readonly systemName: string;
  /** Прозвище устройства или null. */
  readonly deviceNickname: string | null;
}

/** Чат вместе с данными собеседника (результат JOIN). */
export interface LocalChatWithPeer extends LocalChat {
  /** Данные устройства собеседника или null если ещё не загружены. */
  readonly peer: LocalPeerDevice | null;
}

/** Ключи чата в локальной SQLite. В период pending_key хранит ECDH-приватный ключ, после обмена — AES-ключ и рачет-состояние. */
export interface LocalChatKey {
  /** ID чата. */
  readonly chatId: string;
  /**
   * Зашифрованный AES-256-GCM ключ чата (base64, wrapped мастер-ключом).
   * Пустая строка '' до завершения обмена ключами (pending_key фаза).
   */
  readonly encryptedKey: string;
  /** IV оборачивания AES-ключа (base64). Пустая строка '' в pending_key фазе. */
  readonly keyIv: string;
  /** Зашифрованный ECDH приватный ключ (base64, pkcs8, wrapped мастер-ключом). null после обмена. */
  readonly encryptedPrivKey: string | null;
  /** IV оборачивания ECDH приватного ключа (base64). null после обмена. */
  readonly privKeyIv: string | null;
  /**
   * Предыдущий AES-ключ (base64, wrapped мастер-ключом).
   * Используется для расшифровки сообщений «в пути» при рачет-ротации.
   * Пустая строка '' если предыдущего ключа нет.
   */
  readonly prevEncryptedKey: string;
  /** IV предыдущего AES-ключа (base64). Пустая строка '' если нет предыдущего. */
  readonly prevKeyIv: string;
  /**
   * Текущий рачет-приватный ключ (base64, pkcs8, wrapped мастер-ключом).
   * Используется для DH-шага при получении нового публичного ключа собеседника.
   * null до первой генерации или после рачет-шага с новым ключом.
   */
  readonly myRatchetEncryptedPrivKey: string | null;
  /** IV оборачивания рачет-приватного ключа (base64). null если myRatchetEncryptedPrivKey = null. */
  readonly myRatchetPrivKeyIv: string | null;
  /**
   * Текущий рачет-публичный ключ (base64, raw 32 байта).
   * Включается в заголовок каждого исходящего сообщения.
   * null до первой генерации.
   */
  readonly myRatchetPubKey: string | null;
  /**
   * Последний полученный рачет-публичный ключ собеседника (base64).
   * Используется для детектирования нового ключа и предотвращения повторных рачет-шагов.
   * null до получения первого сообщения с рачет-ключом.
   */
  readonly peerRatchetPubKey: string | null;
  /** Unix-время создания (мс). */
  readonly createdAt: number;
}

/** Поля для атомарного обновления рачет-состояния в chat_keys. */
export interface LocalChatKeyRatchetUpdate {
  /** Новый зашифрованный AES-ключ (base64). */
  readonly encryptedKey: string;
  /** IV нового AES-ключа (base64). */
  readonly keyIv: string;
  /** Предыдущий зашифрованный AES-ключ (base64). */
  readonly prevEncryptedKey: string;
  /** IV предыдущего AES-ключа (base64). */
  readonly prevKeyIv: string;
  /** Новый рачет-приватный ключ (base64, wrapped). */
  readonly myRatchetEncryptedPrivKey: string;
  /** IV нового рачет-приватного ключа (base64). */
  readonly myRatchetPrivKeyIv: string;
  /** Новый рачет-публичный ключ (base64). */
  readonly myRatchetPubKey: string;
  /** Рачет-публичный ключ собеседника (base64). */
  readonly peerRatchetPubKey: string;
}

/** Сообщение из локальной SQLite. */
export interface LocalMessage {
  /** ID сообщения (с сервера). */
  readonly id: string;
  /** ID чата. */
  readonly chatId: string;
  /** ID сессии-отправителя. */
  readonly senderSessionId: string;
  /** Текст сообщения (расшифрованный). */
  readonly content: string;
  /** Статус доставки. */
  readonly status: LocalMessageStatus;
  /** true — исходящее (отправлено текущей сессией). */
  readonly isOutgoing: boolean;
  /** Unix-время создания (мс). */
  readonly createdAt: number;
}
