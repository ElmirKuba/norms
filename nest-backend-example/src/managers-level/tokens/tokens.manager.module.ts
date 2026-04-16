import { Module } from '@nestjs/common';
import { GenerateTokensManagerModule } from './generate-tokens/generate-tokens.manager.module';
import { ValidateTokensManagerModule } from './validate-tokens/validate-tokens.manager.module';

/** Модуль всех модулей бизнес логики уровня Manager связанных с токенами */
@Module({
  imports: [GenerateTokensManagerModule, ValidateTokensManagerModule],
  exports: [],
  controllers: [],
  providers: [],
})
export class TokensManagerModule {}
