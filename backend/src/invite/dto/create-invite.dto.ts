import { IsISO8601 } from 'class-validator';

/** DTO создания инвайт-кода. */
export class CreateInviteDto {
  /** ISO-8601 дата истечения кода. Минимальный TTL — 1 час, максимальный — 30 дней. */
  @IsISO8601({ strict: true })
  public readonly expires_at!: string;
}
