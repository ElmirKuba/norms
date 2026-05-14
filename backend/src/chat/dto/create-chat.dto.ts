import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/** DTO для создания чата. */
export class CreateChatDto {
  /** Название чата. Уникально для пары устройств (case-insensitive). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public readonly name!: string;

  /** ID сессии получателя (устройство собеседника). */
  @IsString()
  @IsNotEmpty()
  public readonly receiver_session_id!: string;
}
