import type { Platform } from '../../common/types/platform.type';

/** Доменная сущность сессии (устройства). */
export interface SessionEntity {
  /** Уникальный ID сессии в формате {uuid-v7}_{unix-ms}. */
  readonly id: string;
  /** ID аккаунта-владельца. */
  readonly accountId: string;
  /** Системное имя устройства, например «iPhone 14 Pro». */
  readonly systemName: string;
  /** Платформа устройства. */
  readonly platform: Platform;
  /** Прозвище устройства, видимое другим пользователям. null если не задано. */
  readonly nickname: string | null;
  /** SHA-256 hex-хеш refresh-токена. Сам токен клиенту не хранится. */
  readonly refreshTokenHash: string;
  /** Дата создания сессии. */
  readonly createdAt: Date;
  /** Дата последней ротации refresh-токена. */
  readonly updatedAt: Date;
}

/** Данные для создания новой сессии. */
export interface CreateSessionData {
  /** ID аккаунта-владельца. */
  readonly accountId: string;
  /** Системное имя устройства. */
  readonly systemName: string;
  /** Платформа устройства. */
  readonly platform: Platform;
  /** Опциональное прозвище устройства. */
  readonly nickname?: string;
  /** SHA-256 hex-хеш refresh-токена. */
  readonly refreshTokenHash: string;
}
