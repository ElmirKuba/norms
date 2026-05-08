import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/** DTO для сброса пароля по одноразовому reset_token. */
export class ResetPasswordDto {
  /** Одноразовый токен из ответа check-answer (TTL 10 минут). */
  @IsString()
  @IsNotEmpty()
  public readonly reset_token!: string;

  /** Новый пароль (минимум 8 символов). */
  @IsString()
  @MinLength(8)
  public readonly new_password!: string;
}
