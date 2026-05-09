/* eslint-disable @typescript-eslint/naming-convention -- snake_case JSON */
import { IsString, MinLength } from 'class-validator';

/** DTO смены пароля. */
export class UpdateAccountDto {
  /** Текущий пароль для подтверждения. */
  @IsString()
  public readonly current_password!: string;

  /** Новый пароль — минимум 8 символов. */
  @IsString()
  @MinLength(8)
  public readonly new_password!: string;
}
/* eslint-enable @typescript-eslint/naming-convention */
