/** Доменная сущность вопроса восстановления доступа. */
export interface RecoveryQuestionEntity {
  /** Уникальный ID в формате {uuid-v7}_{unix-ms}. */
  readonly id: string;
  /** ID аккаунта-владельца. */
  readonly accountId: string;
  /** Текст вопроса (открытый текст). */
  readonly question: string;
  /** Argon2id-хеш нормализованного ответа. */
  readonly answerHash: string;
  /** Дата создания. */
  readonly createdAt: Date;
  /** Дата последнего обновления. */
  readonly updatedAt: Date;
}

/** Данные для создания вопроса восстановления. */
export interface CreateRecoveryQuestionData {
  /** ID аккаунта-владельца. */
  readonly accountId: string;
  /** Текст вопроса. */
  readonly question: string;
  /** Argon2id-хеш нормализованного ответа. */
  readonly answerHash: string;
}

/** Данные для обновления вопроса восстановления. */
export interface UpdateRecoveryQuestionData {
  /** Новый текст вопроса (опционально). */
  readonly question?: string;
  /** Новый argon2id-хеш ответа (опционально). */
  readonly answerHash?: string;
}
