import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** DTO для обновления Q/A пары. Оба поля опциональны — можно менять только вопрос или только ответ. */
export class UpdateQuestionDto {
  /** Новый текст вопроса (опционально). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  public readonly question?: string;

  /** Новый ответ (опционально, plain-text — бэк нормализует и хеширует). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  public readonly answer?: string;
}
