import { IsString, IsNotEmpty, IsBase64 } from 'class-validator';

/** DTO для загрузки публичного ECDH-ключа в чат. */
export class SubmitChatKeyDto {
  /** ID чата. */
  @IsString()
  @IsNotEmpty()
  public readonly chat_id!: string;

  /** X25519 публичный ключ в base64. */
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  public readonly public_key!: string;
}
