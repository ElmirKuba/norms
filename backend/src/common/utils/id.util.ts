import { v7 as uuidv7 } from 'uuid';

/**
 * Generates a unique entity ID in `{uuid-v7}_{unix-ms}` format.
 * @returns Sortable unique ID string.
 */
export function generateId(): string {
  return `${uuidv7()}_${Date.now().toString()}`;
}
