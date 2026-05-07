import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { UIN_QUEUE_NAME } from './uin.constants';
import { UinService } from './uin.service';
import { UinController } from './uin.controller';
import { UinGenerationProcessor } from './processors/uin-generation.processor';
import { ReadUinStatusUseCase } from './use-cases/read-uin-status.use-case';

/** Модуль генерации и статуса UIN через BullMQ. */
@Module({
  imports: [
    BullModule.registerQueue({ name: UIN_QUEUE_NAME }),
    AuthModule,
    PersistenceModule,
  ],
  providers: [UinService, UinGenerationProcessor, ReadUinStatusUseCase],
  controllers: [UinController],
  exports: [UinService],
})
export class UinModule {}
