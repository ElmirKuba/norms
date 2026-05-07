import { IsIn, IsOptional, IsString, Length, MinLength, MaxLength } from 'class-validator';
import type { Platform } from '../../common/types/platform.type';

/** DTO для регистрации нового аккаунта. */
export class CreateAccountDto {
  /** Пароль в открытом виде — минимум 8 символов, хешируется на сервере. */
  @IsString()
  @MinLength(8)
  public password!: string;

  /** 10-значный инвайт-код. Обязателен если FREE_REGISTRATION=false. */
  @IsOptional()
  @IsString()
  @Length(10, 10)
  public invite_code?: string | null;

  /** Системное имя устройства, например «iPhone 14 Pro». */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  public system_name!: string;

  /** Платформа устройства. */
  @IsIn(['ios', 'android', 'electron'])
  public platform!: Platform;
}
