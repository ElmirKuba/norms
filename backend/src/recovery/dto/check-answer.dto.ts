import { IsNotEmpty, IsString } from 'class-validator';

/** DTO для проверки ответа на секретный вопрос. */
export class CheckAnswerDto {
  /** ID аккаунта (из ответа read-questions-for-login). */
  @IsString()
  @IsNotEmpty()
  public readonly account_id!: string;

  /** ID вопроса, на который отвечает пользователь. */
  @IsString()
  @IsNotEmpty()
  public readonly question_id!: string;

  /** Ответ пользователя (plain-text, бэк нормализует перед проверкой). */
  @IsString()
  @IsNotEmpty()
  public readonly answer!: string;
}
