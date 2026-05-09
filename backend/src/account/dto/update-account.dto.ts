/* eslint-disable @typescript-eslint/naming-convention -- snake_case JSON */
import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

/** DTO обновления аккаунта — смена пароля и/или псевдонима. */
export class UpdateAccountDto {
  /** Текущий пароль — обязателен при смене пароля. */
  @ValidateIf((o: UpdateAccountDto) => o.new_password !== undefined)
  @IsString()
  public readonly current_password?: string;

  /** Новый пароль — минимум 8 символов. Если передан, current_password обязателен. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  public readonly new_password?: string;

  /** Псевдоним (display name) — произвольный текст до 100 символов, или null чтобы удалить. */
  @IsOptional()
  @ValidateIf((o: UpdateAccountDto) => o.nickname !== null)
  @IsString()
  @MaxLength(100)
  public readonly nickname?: string | null;
}
/* eslint-enable @typescript-eslint/naming-convention */
