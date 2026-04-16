import { Module } from '@nestjs/common';
import { ValidateTokensManagerService } from './validate-tokens.manager.service';

/** Модуль бизнес логики уровня Manager связанных с валидацией токенов */
@Module({
  imports: [],
  exports: [ValidateTokensManagerService],
  controllers: [],
  providers: [ValidateTokensManagerService],
})
export class ValidateTokensManagerModule {}
