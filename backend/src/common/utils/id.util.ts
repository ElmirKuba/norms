import { v7 as uuidv7 } from 'uuid';

/**
 * Генерирует уникальный ID сущности в формате `{uuid-v7}_{unix-ms}`.
 * @returns Сортируемая уникальная строка-идентификатор.
 */
export function generateId(): string {
  return `${uuidv7()}_${Date.now().toString()}`;
}
