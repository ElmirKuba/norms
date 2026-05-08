import { Injectable } from '@nestjs/common';
import { RecoveryQuestionRepository } from '../../domain/ports/recovery-question.repository.port';
import type { RecoveryQuestionEntity } from '../../domain/entities/recovery-question.entity';

/** Форма одного элемента списка Q/A в ответе. */
interface QuestionListItem {
  /** ID вопроса. */
  readonly id: string;
  /** Текст вопроса. */
  readonly question: string;
  /** Дата создания. */
  readonly created_at: string;
  /** Дата обновления. */
  readonly updated_at: string;
}

/** Use-case получения списка своих Q/A (без хешей ответов). */
@Injectable()
export class ReadQuestionsUseCase {
  public constructor(private readonly _recoveryRepo: RecoveryQuestionRepository) {}

  /**
   * Возвращает все Q/A текущего аккаунта без хешей ответов.
   * @param accountId - ID аккаунта из JWT.
   * @returns Массив объектов { id, question, created_at, updated_at }.
   */
  public async execute(accountId: string): Promise<QuestionListItem[]> {
    const entities = await this._recoveryRepo.findByAccountId(accountId);
    return entities.map((e: RecoveryQuestionEntity): QuestionListItem => ({
      id: e.id,
      question: e.question,
      created_at: e.createdAt.toISOString(),
      updated_at: e.updatedAt.toISOString(),
    }));
  }
}
