import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { RecoveryQuestionRepository } from '../../domain/ports/recovery-question.repository.port';
import type { CreateQuestionDto } from '../dto/create-question.dto';

/** Форма ответа use-case создания вопроса. */
interface CreateQuestionResult {
  /** ID созданного вопроса. */
  readonly id: string;
  /** Текст вопроса. */
  readonly question: string;
  /** Дата создания. */
  readonly created_at: string;
}

/**
 * Нормализует ответ перед хешированием: trim → lowercase → collapse spaces → NFC.
 * @param answer - Ответ пользователя.
 * @returns Нормализованная строка.
 */
function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC');
}

/** Use-case создания Q/A пары восстановления доступа. */
@Injectable()
export class CreateQuestionUseCase {
  public constructor(private readonly _recoveryRepo: RecoveryQuestionRepository) {}

  /**
   * Создаёт новую Q/A пару: нормализует ответ, хеширует argon2id, сохраняет.
   * @param accountId - ID аккаунта из JWT.
   * @param dto - Текст вопроса и ответ.
   * @returns ID, вопрос и дата создания.
   */
  public async execute(accountId: string, dto: CreateQuestionDto): Promise<CreateQuestionResult> {
    const answerHash = await argon2.hash(normalizeAnswer(dto.answer));
    const entity = await this._recoveryRepo.create({
      accountId,
      question: dto.question,
      answerHash,
    });
    return {
      id: entity.id,
      question: entity.question,
      created_at: entity.createdAt.toISOString(),
    };
  }
}
