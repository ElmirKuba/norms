import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RecoveryQuestionRepository } from '../../domain/ports/recovery-question.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';

/** Use-case удаления Q/A пары восстановления доступа. */
@Injectable()
export class DeleteQuestionUseCase {
  public constructor(private readonly _recoveryRepo: RecoveryQuestionRepository) {}

  /**
   * Удаляет вопрос восстановления. Нельзя удалить чужой вопрос.
   * @param accountId - ID аккаунта из JWT.
   * @param questionId - ID удаляемого вопроса.
   * @throws NotFoundException если вопрос не найден.
   * @throws ForbiddenException если вопрос принадлежит другому аккаунту.
   */
  public async execute(accountId: string, questionId: string): Promise<void> {
    const existing = await this._recoveryRepo.findById(questionId);
    if (existing === null) {
      throw new NotFoundException(makeError(ErrorCode.RECOVERY_QUESTION_NOT_FOUND));
    }
    if (existing.accountId !== accountId) {
      throw new ForbiddenException(makeError(ErrorCode.NOT_YOUR_RECOVERY_QUESTION));
    }
    await this._recoveryRepo.delete(questionId);
  }
}
