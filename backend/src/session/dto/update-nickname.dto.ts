import { IsString, IsOptional, MaxLength } from 'class-validator';

/** DTO для установки/снятия прозвища текущей сессии. */
export class UpdateNicknameDto {
  /** Новое прозвище или null для снятия. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly nickname!: string | null;
}
