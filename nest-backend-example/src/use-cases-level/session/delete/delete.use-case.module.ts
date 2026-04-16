import { Module } from '@nestjs/common';
import { ReadSessionManagerModule } from '../../../managers-level/session/read/read-session.manager.module';
import { SessionDeleteUseCaseService } from './delete.use-case.service';
import { DeleteSessionManagerModule } from '../../../managers-level/session/delete/delete.manager.module';

/** Модуль бизнес логики уровня UseCase удаления сессий */
@Module({
  imports: [ReadSessionManagerModule, DeleteSessionManagerModule],
  exports: [SessionDeleteUseCaseService],
  controllers: [],
  providers: [SessionDeleteUseCaseService],
})
export class SessionDeleteUseCaseModule {}
