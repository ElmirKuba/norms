/** Доменная сущность инвайта (кода приглашения). */
export interface InviteEntity {
  /** Уникальный ID инвайта в формате {uuid-v7}_{unix-ms}. */
  readonly id: string;
  /** ID аккаунта, выдавшего инвайт. */
  readonly accountId: string;
  /** 10-значный код приглашения. */
  readonly code: string;
  /** Дата истечения срока действия кода. */
  readonly expiresAt: Date;
  /** Дата создания инвайта. */
  readonly createdAt: Date;
}

/** Данные для создания нового инвайта. */
export interface CreateInviteData {
  /** ID аккаунта-инвайтера. */
  readonly accountId: string;
  /** 10-значный код. */
  readonly code: string;
  /** Дата истечения. */
  readonly expiresAt: Date;
}
