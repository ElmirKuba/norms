/** Доменная сущность аккаунта пользователя. */
export interface AccountEntity {
  /** Уникальный ID аккаунта в формате {uuid-v7}_{unix-ms}. */
  readonly id: string;
  /** Произвольный псевдоним (display name) или null если не задан. */
  readonly nickname: string | null;
  /** Опциональный юзернейм без учёта регистра. */
  readonly username: string | null;
  /** Хеш пароля (Argon2id). */
  readonly passwordHash: string;
  /** Оставшееся количество инвайтов. */
  readonly invitesRemaining: number;
  /** Флаг администратора. */
  readonly isAdmin: boolean;
  /** Дата и время создания аккаунта. */
  readonly createdAt: Date;
  /** Дата и время последнего обновления. */
  readonly updatedAt: Date;
}

/** Данные для создания нового аккаунта. */
export interface CreateAccountData {
  /** Хеш пароля (Argon2id). */
  readonly passwordHash: string;
  /** Опциональный юзернейм. */
  readonly username?: string;
  /** Начальное количество инвайтов — по умолчанию 3. */
  readonly invitesRemaining?: number;
  /** Флаг администратора — по умолчанию false. */
  readonly isAdmin?: boolean;
}

/** Результат поиска аккаунта (публичные поля). */
export interface AccountSearchResult {
  /** ID аккаунта. */
  readonly accountId: string;
  /** UIN или null если ещё не назначен. */
  readonly uin: string | null;
  /** Username или null. */
  readonly username: string | null;
}

/** Частичные данные аккаунта для обновления — изменяются только переданные поля. */
export interface UpdateAccountData {
  /** Новый псевдоним (display name), или null чтобы удалить. */
  readonly nickname?: string | null;
  /** Новый юзернейм, или null чтобы удалить его. */
  readonly username?: string | null;
  /** Новый хеш пароля. */
  readonly passwordHash?: string;
  /** Новое количество инвайтов. */
  readonly invitesRemaining?: number;
}
