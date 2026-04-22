export abstract class StorageService {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract remove(key: string): Promise<void>;
}
