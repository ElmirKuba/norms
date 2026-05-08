import type { RecoveryQuestionEntity, CreateRecoveryQuestionData, UpdateRecoveryQuestionData } from '../entities/recovery-question.entity';

/** Публичный вопрос восстановления (без хеша ответа). */
export interface PublicRecoveryQuestion {
  /** ID вопроса. */
  readonly id: string;
  /** Текст вопроса. */
  readonly question: string;
}

/** Порт (абстракция) для операций с вопросами восстановления доступа. */
export abstract class RecoveryQuestionRepository {
  /**
   * Находит вопрос по ID.
   * @param id - ID вопроса.
   * @returns Сущность вопроса или null если не найден.
   */
  public abstract findById(id: string): Promise<RecoveryQuestionEntity | null>;

  /**
   * Возвращает все вопросы аккаунта (включая answerHash — только для сервера).
   * @param accountId - ID аккаунта.
   * @returns Массив сущностей вопросов.
   */
  public abstract findByAccountId(accountId: string): Promise<RecoveryQuestionEntity[]>;

  /**
   * Возвращает публичный список вопросов аккаунта (без хешей) для экрана «Забыл пароль».
   * @param accountId - ID аккаунта.
   * @returns Массив PublicRecoveryQuestion.
   */
  public abstract findPublicByAccountId(accountId: string): Promise<PublicRecoveryQuestion[]>;

  /**
   * Создаёт и сохраняет новый вопрос.
   * @param data - Данные для создания.
   * @returns Созданная сущность вопроса.
   */
  public abstract create(data: CreateRecoveryQuestionData): Promise<RecoveryQuestionEntity>;

  /**
   * Обновляет вопрос и/или хеш ответа.
   * @param id - ID вопроса.
   * @param data - Поля для обновления.
   * @returns Обновлённая сущность или null если не найден.
   */
  public abstract update(id: string, data: UpdateRecoveryQuestionData): Promise<RecoveryQuestionEntity | null>;

  /**
   * Удаляет вопрос по ID.
   * @param id - ID вопроса.
   */
  public abstract delete(id: string): Promise<void>;
}
