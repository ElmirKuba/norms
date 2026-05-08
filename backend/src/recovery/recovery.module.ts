import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { RedisModule } from '../redis/redis.module';
import { RecoveryController } from './recovery.controller';
import { GetPresetQuestionsUseCase } from './use-cases/get-preset-questions.use-case';
import { CreateQuestionUseCase } from './use-cases/create-question.use-case';
import { ReadQuestionsUseCase } from './use-cases/read-questions.use-case';
import { UpdateQuestionUseCase } from './use-cases/update-question.use-case';
import { DeleteQuestionUseCase } from './use-cases/delete-question.use-case';
import { ReadQuestionsForLoginUseCase } from './use-cases/read-questions-for-login.use-case';
import { CheckAnswerUseCase } from './use-cases/check-answer.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';

/** Модуль восстановления доступа: Q/A CRUD и поток сброса пароля. */
@Module({
  imports: [AuthModule, PersistenceModule, RedisModule],
  controllers: [RecoveryController],
  providers: [
    GetPresetQuestionsUseCase,
    CreateQuestionUseCase,
    ReadQuestionsUseCase,
    UpdateQuestionUseCase,
    DeleteQuestionUseCase,
    ReadQuestionsForLoginUseCase,
    CheckAnswerUseCase,
    ResetPasswordUseCase,
  ],
})
export class RecoveryModule {}
