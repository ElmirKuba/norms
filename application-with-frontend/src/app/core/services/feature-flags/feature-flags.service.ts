import { Injectable, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map, catchError, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../api/api-config';
import type { FeatureFlags } from '../../../features/application/auth/types/auth.types';

/* eslint-disable @typescript-eslint/naming-convention -- API использует snake_case */
/** Форма ответа API /app/feature-flags. */
interface FeatureFlagsApiResponse {
  /** Регистрация без инвайт-кода. */
  readonly free_registration: boolean;
  /** Dev-режим. */
  readonly dev_mode: boolean;
}
/* eslint-enable @typescript-eslint/naming-convention */

/** Флаги по умолчанию — самый консервативный вариант при недоступном бэкенде. */
const DEFAULT_FLAGS: FeatureFlags = {
  freeRegistration: false,
  devMode: false,
};

/** Загружает feature flags с бэкенда и предоставляет их как Signal. */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  /** Текущие feature flags. Гарантированно не null — при ошибке используются DEFAULT_FLAGS. */
  public readonly flags: Signal<FeatureFlags>;

  /** HTTP-клиент для запросов к бэкенду. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /** Внутреннее хранилище флагов. */
  private readonly _flags: ReturnType<typeof signal<FeatureFlags>> = signal<FeatureFlags>(DEFAULT_FLAGS);

  public constructor() {
    this.flags = this._flags.asReadonly();
  }

  /**
   * Запрашивает флаги с бэкенда. При любой сетевой ошибке оставляет DEFAULT_FLAGS.
   * Вызывается один раз через APP_INITIALIZER.
   * @returns Observable, который эмитит void и завершается после загрузки.
   */
  public load(): Observable<void> {
    return this._http.get<FeatureFlagsApiResponse>(`${this._baseUrl}/app/feature-flags`).pipe(
      tap((response: FeatureFlagsApiResponse): void => {
        this._flags.set({
          freeRegistration: response.free_registration,
          devMode: response.dev_mode,
        });
      }),
      map((): void => { /* преобразуем ответ в void */ }),
      catchError((): Observable<void> => of(undefined)),
    );
  }
}
