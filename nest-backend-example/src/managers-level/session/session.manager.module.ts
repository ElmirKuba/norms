import { Module } from '@nestjs/common';
import { CreateOrUpdateSessionManagerModule } from './create-or-update/create-or-update.manager.module';
import { ReadSessionManagerModule } from './read/read-session.manager.module';
import { DeleteSessionManagerModule } from './delete/delete.manager.module';

@Module({
  imports: [
    CreateOrUpdateSessionManagerModule,
    ReadSessionManagerModule,
    DeleteSessionManagerModule,
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export class SessionManagerModule {}
