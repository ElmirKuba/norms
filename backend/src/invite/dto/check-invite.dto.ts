import { IsString, Length } from 'class-validator';

/** DTO для проверки инвайт-кода. */
export class CheckInviteDto {
  /** 10-значный код приглашения. */
  @IsString()
  @Length(10, 10)
  public code!: string;
}
