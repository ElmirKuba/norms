import { InjectionToken } from '@angular/core';

/** Base URL всех API-запросов к бэкенду. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: (): string => 'http://localhost:3000/api/v1',
});
