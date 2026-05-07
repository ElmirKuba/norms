import { IsIn, IsString, MinLength, MaxLength } from 'class-validator';
import type { Platform } from '../../common/types/platform.type';

/** DTO для авторизации — логин через UIN (только цифры) или username. */
export class AuthAccountDto {
  /** UIN (числовая строка) или username. */
  @IsString()
  @MinLength(1)
  public login!: string;

  /** Пароль в открытом виде. */
  @IsString()
  @MinLength(1)
  public password!: string;

  /** Системное имя устройства. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  public system_name!: string;

  /** Платформа устройства. */
  @IsIn(['ios', 'android', 'electron'])
  public platform!: Platform;
}
