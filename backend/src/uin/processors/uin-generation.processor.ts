import { Injectable, Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DatabaseError } from 'pg';
import { eq } from 'drizzle-orm';
import { UIN_QUEUE_NAME } from '../uin.constants';
import type { UinJobData } from '../types/uin-job.type';
import { DRIZZLE_DB } from '../../persistence/drizzle.module';
import type { DrizzleDb } from '../../persistence/drizzle.module';
import { uins } from '../../persistence/schemas';
import { generateId } from '../../common/utils/id.util';
import { WssConnectionStore } from '../../wss/wss-connection.store';

/** Код ошибки PostgreSQL при нарушении уникального ограничения. */
const PG_UNIQUE_VIOLATION = '23505';

/** Имя constraint уникальности number в таблице uins (от Drizzle .unique()). */
const UINS_NUMBER_CONSTRAINT = 'uins_number_unique';

/** Имя partial unique index на accountId (partial unique — тоже 23505). */
const UINS_ACCOUNT_CONSTRAINT = 'uins_account_id_unique';

/** Минимальное количество цифр в UIN. */
const MIN_DIGITS = 4;

/** Максимальное количество цифр в UIN. */
const MAX_DIGITS = 10;

/** Количество попыток на каждую длину перед переходом к следующей. */
const MAX_RETRIES_PER_LENGTH = 20;

/** Процессор BullMQ для генерации и присвоения UIN аккаунту. */
@Processor(UIN_QUEUE_NAME)
@Injectable()
export class UinGenerationProcessor extends WorkerHost {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
    private readonly _wss: WssConnectionStore,
  ) {
    super();
  }

  /**
   * Обрабатывает задачу генерации UIN — идемпотентен при дублировании.
   * При успешной генерации отправляет WSS-событие uin_assigned аккаунту.
   * @param job - BullMQ-задача с данными аккаунта.
   * @returns Промис без значения.
   */
  public async process(job: Job<UinJobData>): Promise<void> {
    const uin = await this._assignUin(job.data.accountId);
    if (uin !== null) {
      this._wss.sendToAccount(job.data.accountId, 'uin_assigned', { uin });
    }
  }

  /**
   * Генерирует уникальный UIN и вставляет запись в таблицу uins.
   * При авто-расширении: начинает с 4 цифр, увеличивает до 10 при коллизиях.
   * Идемпотентен: если аккаунт уже имеет UIN — возвращает null.
   * @param accountId - ID аккаунта.
   * @returns Присвоенный UIN или null если аккаунт уже имел UIN.
   * @throws Error если не удалось сгенерировать UIN после всех попыток.
   */
  private async _assignUin(accountId: string): Promise<string | null> {
    const existing = await this._db
      .select({ id: uins.id, number: uins.number })
      .from(uins)
      .where(eq(uins.accountId, accountId))
      .limit(1);
    if (existing.length > 0) {
      return null;
    }

    for (let digits = MIN_DIGITS; digits <= MAX_DIGITS; digits++) {
      for (let attempt = 0; attempt < MAX_RETRIES_PER_LENGTH; attempt++) {
        const number = this._randomNumber(digits);
        try {
          await this._db.insert(uins).values({
            id: generateId(),
            accountId,
            number,
            isPremium: false,
          });
          return number;
        } catch (error: unknown) {
          if (error instanceof DatabaseError && error.code === PG_UNIQUE_VIOLATION) {
            if (error.constraint === UINS_ACCOUNT_CONSTRAINT) {
              return null;
            }
            if (error.constraint === UINS_NUMBER_CONSTRAINT) {
              continue;
            }
          }
          throw error;
        }
      }
    }

    throw new Error(`Не удалось сгенерировать UIN для аккаунта ${accountId} после всех попыток`);
  }

  /**
   * Генерирует случайное число с заданным количеством цифр (без ведущих нулей).
   * @param digits - Количество цифр.
   * @returns Строка с числом.
   */
  private _randomNumber(digits: number): string {
    const min = 10 ** (digits - 1);
    const max = 10 ** digits - 1;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }
}
