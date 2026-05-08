import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { RecoveryQuestionRepository } from '../../domain/ports/recovery-question.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import type { UpdateQuestionDto } from '../dto/update-question.dto';

/**
 * Нормализует ответ перед хешированием: trim → lowercase → collapse spaces → NFC.
 * @param answer - Ответ пользователя.
 * @returns Нормализованная строка.
 */
function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC');
}

/** Use-case обновления Q/A пары: вопроса и/или ответа. */
@Injectable()
export class UpdateQuestionUseCase {
  public constructor(private readonly _recoveryRepo: RecoveryQuestionRepository) {}

  /**
   * Обновляет текст вопроса и/или хеш ответа.
   * @param accountId - ID аккаунта из JWT.
   * @param questionId - ID изменяемого вопроса.
   * @param dto - Новые значения вопроса и/или ответа.
   * @throws NotFoundException если вопрос не найден.
   * @throws ForbiddenException если вопрос принадлежит другому аккаунту.
   */
  public async execute(accountId: string, questionId: string, dto: UpdateQuestionDto): Promise<void> {
    const existing = await this._recoveryRepo.findById(questionId);
    if (existing === null) {
      throw new NotFoundException(makeError(ErrorCode.RECOVERY_QUESTION_NOT_FOUND));
    }
    if (existing.accountId !== accountId) {
      throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_RECOVERY_QUESTION));
    }

    const newQuestion = dto.question;
    const newAnswerHash = dto.answer !== undefined
      ? await argon2.hash(normalizeAnswer(dto.answer))
      : undefined;

    await this._recoveryRepo.update(questionId, {
      ...(newQuestion !== undefined ? { question: newQuestion } : {}),
      ...(newAnswerHash !== undefined ? { answerHash: newAnswerHash } : {}),
    });
  }
}
