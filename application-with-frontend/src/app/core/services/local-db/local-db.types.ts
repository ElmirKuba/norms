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
