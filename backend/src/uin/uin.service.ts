import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UIN_QUEUE_NAME } from './uin.constants';
import type { UinJobData } from './types/uin-job.type';

/** Сервис для постановки задач генерации UIN в очередь. */
@Injectable()
export class UinService {
  public constructor(
    @InjectQueue(UIN_QUEUE_NAME) private readonly _queue: Queue<UinJobData>,
  ) {}

  /**
   * Ставит задачу генерации UIN для указанного аккаунта.
   * @param accountId - ID аккаунта.
   */
  public async enqueueGeneration(accountId: string): Promise<void> {
    await this._queue.add('generate', { accountId });
  }
}
