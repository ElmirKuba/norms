/** Статус обмена ключами чата. */
export type ChatStatus = 'pending_key' | 'active';

/** Доменная сущность чата (соединение двух устройств). */
export interface ChatEntity {
  /** Уникальный ID чата — формат {uuid-v7}_{unix-ms}. */
  readonly id: string;
  /** Название чата (не шифруется). */
  readonly name: string;
  /** ID сессии — min(a, b) из пары. FK cascade. */
  readonly sessionAId: string;
  /** ID сессии — max(a, b) из пары. FK cascade. */
  readonly sessionBId: string;
  /** ID сессии-инициатора или null (SET NULL при кике). */
  readonly createdBySessionId: string | null;
  /** Статус обмена ключами. */
  readonly status: ChatStatus;
  /** X25519 публичный ключ session_a (base64) или null после обмена. */
  readonly publicKeyA: string | null;
  /** X25519 публичный ключ session_b (base64) или null после обмена. */
  readonly publicKeyB: string | null;
  /** Дата создания чата. */
  readonly createdAt: Date;
  /** Дата последнего обновления. */
  readonly updatedAt: Date;
}

/** Осиротевший собеседник — аккаунт, с которым были чаты с других устройств, но нет с текущего. */
export interface OrphanPeer {
  /** ID аккаунта собеседника. */
  readonly accountId: string;
  /** UIN собеседника или null. */
  readonly uin: string | null;
  /** Никнейм аккаунта или null. */
  readonly nickname: string | null;
  /** Username или null. */
  readonly username: string | null;
  /** Дата последнего чата с этим аккаунтом с других устройств. */
  readonly lastChatAt: Date;
}

/** Элемент списка чатов с данными собеседника. */
export interface ChatListItem {
  /** ID чата. */
  readonly id: string;
  /** Название чата. */
  readonly name: string;
  /** Статус обмена ключами. */
  readonly status: ChatStatus;
  /** Дата создания чата. */
  readonly createdAt: Date;
  /** Данные сессии-собеседника. */
  readonly peer: {
    /** ID сессии собеседника. */
    readonly sessionId: string;
    /** Системное имя устройства собеседника. */
    readonly systemName: string;
    /** Прозвище устройства собеседника или null. */
    readonly deviceNickname: string | null;
    /** ID аккаунта собеседника. */
    readonly accountId: string;
    /** UIN собеседника или null (ещё не назначен). */
    readonly uin: string | null;
    /** Никнейм аккаунта собеседника или null. */
    readonly nickname: string | null;
    /** Username собеседника или null. */
    readonly username: string | null;
  };
}

/** Данные для создания нового чата. */
export interface CreateChatData {
  /** Название чата. */
  readonly name: string;
  /** ID сессии — меньший из пары (min). */
  readonly sessionAId: string;
  /** ID сессии — больший из пары (max). */
  readonly sessionBId: string;
  /** ID сессии-инициатора. */
  readonly createdBySessionId: string;
  /** Начальный статус. */
  readonly status: ChatStatus;
}
