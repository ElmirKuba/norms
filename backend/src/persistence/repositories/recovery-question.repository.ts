import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { RecoveryQuestionRepository } from '../../domain/ports/recovery-question.repository.port';
import type { PublicRecoveryQuestion } from '../../domain/ports/recovery-question.repository.port';
import type { RecoveryQuestionEntity, CreateRecoveryQuestionData, UpdateRecoveryQuestionData } from '../../domain/entities/recovery-question.entity';
import { generateId } from '../../common/utils/id.util';
import { recoveryQuestions } from '../schemas';
import { DRIZZLE_DB } from '../drizzle.module';
import type { DrizzleDb } from '../drizzle.module';

/** Реализация порта RecoveryQuestionRepository через Drizzle ORM. */
@Injectable()
export class DrizzleRecoveryQuestionRepository extends RecoveryQuestionRepository {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
  ) {
    super();
  }

  /**
   * Находит вопрос по ID.
   * @param id - ID вопроса.
   * @returns Сущность вопроса или null если не найден.
   */
  public async findById(id: string): Promise<RecoveryQuestionEntity | null> {
    const rows = await this._db.select().from(recoveryQuestions).where(eq(recoveryQuestions.id, id)).limit(1);
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Возвращает все вопросы аккаунта.
   * @param accountId - ID аккаунта.
   * @returns Массив сущностей вопросов.
   */
  public async findByAccountId(accountId: string): Promise<RecoveryQuestionEntity[]> {
    const rows = await this._db.select().from(recoveryQuestions).where(eq(recoveryQuestions.accountId, accountId));
    return rows.map((row: typeof recoveryQuestions.$inferSelect): RecoveryQuestionEntity => this._toEntity(row));
  }

  /**
   * Возвращает публичный список вопросов аккаунта (без хешей).
   * @param accountId - ID аккаунта.
   * @returns Массив объектов { id, question }.
   */
  public async findPublicByAccountId(accountId: string): Promise<PublicRecoveryQuestion[]> {
    const rows = await this._db
      .select({ id: recoveryQuestions.id, question: recoveryQuestions.question })
      .from(recoveryQuestions)
      .where(eq(recoveryQuestions.accountId, accountId));
    return rows;
  }

  /**
   * Создаёт и сохраняет новый вопрос.
   * @param data - Данные для создания.
   * @returns Созданная сущность вопроса.
   * @throws Error если INSERT не вернул строк.
   */
  public async create(data: CreateRecoveryQuestionData): Promise<RecoveryQuestionEntity> {
    const rows = await this._db
      .insert(recoveryQuestions)
      .values({
        id: generateId(),
        accountId: data.accountId,
        question: data.question,
        answerHash: data.answerHash,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) {
      throw new Error('INSERT не вернул строк');
    }
    return this._toEntity(row);
  }

  /**
   * Обновляет вопрос и/или хеш ответа.
   * @param id - ID вопроса.
   * @param data - Поля для обновления.
   * @returns Обновлённая сущность или null если не найден.
   */
  public async update(id: string, data: UpdateRecoveryQuestionData): Promise<RecoveryQuestionEntity | null> {
    const setValues = {
      updatedAt: new Date(),
      ...(data.question !== undefined ? { question: data.question } : {}),
      ...(data.answerHash !== undefined ? { answerHash: data.answerHash } : {}),
    };
    const rows = await this._db
      .update(recoveryQuestions)
      .set(setValues)
      .where(eq(recoveryQuestions.id, id))
      .returning();
    const row = rows[0];
    return row !== undefined ? this._toEntity(row) : null;
  }

  /**
   * Удаляет вопрос по ID.
   * @param id - ID вопроса.
   */
  public async delete(id: string): Promise<void> {
    await this._db.delete(recoveryQuestions).where(eq(recoveryQuestions.id, id));
  }

  /**
   * Преобразует строку из БД в доменную сущность.
   * @param row - Строка из Drizzle-запроса.
   * @returns Доменная сущность вопроса.
   */
  private _toEntity(row: typeof recoveryQuestions.$inferSelect): RecoveryQuestionEntity {
    return {
      id: row.id,
      accountId: row.accountId,
      question: row.question,
      answerHash: row.answerHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
