import { Preferences } from '@capacitor/preferences';
import { StorageService } from './storage.service';

export class StorageCapacitorService extends StorageService {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}
