import { Module } from '@nestjs/common';
import { GenerateTokensManagerService } from './generate-tokens.manager.service';

/** Модуль бизнес логики уровня Manager связанных с генерацией токенов */
@Module({
  imports: [],
  exports: [GenerateTokensManagerService],
  controllers: [],
  providers: [GenerateTokensManagerService],
})
export class GenerateTokensManagerModule {}
