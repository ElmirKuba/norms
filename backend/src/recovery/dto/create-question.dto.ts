import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** DTO для создания Q/A пары восстановления. */
export class CreateQuestionDto {
  /** Текст вопроса (пресет или произвольный). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  public readonly question!: string;

  /** Ответ на вопрос (в plain-text, бэк нормализует и хеширует). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  public readonly answer!: string;
}
