import { IsString, MinLength } from 'class-validator';

/** DTO для ротации токенов через HTTP. */
export class RefreshTokenDto {
  /** Опaque refresh-токен (base64url, 43 символа). */
  @IsString()
  @MinLength(1)
  public refresh_token!: string;
}
