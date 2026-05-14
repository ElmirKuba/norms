import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Base URL всех API-запросов к бэкенду. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: (): string => environment.apiBaseUrl,
});
