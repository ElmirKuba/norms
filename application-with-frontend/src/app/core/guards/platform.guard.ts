import { inject } from '@angular/core';
import { PlatformDetectorService } from '../services/platform/platform.service';
import type { CanMatchFn } from '@angular/router';

/**
 * Guard для маршрутов `/application/*`.
 * Разрешает доступ только на нативных платформах (Capacitor / Electron).
 * Если вернёт false — роутер пробует следующий подходящий маршрут,
 * который содержит redirect на `/web/welcome`.
 * @returns true если платформа нативная, false если браузер
 */
export const nativeOnlyGuard: CanMatchFn = (): boolean =>
  !inject(PlatformDetectorService).isWeb;

/**
 * Guard для маршрутов `/web/*`.
 * Разрешает доступ только в браузере.
 * Если вернёт false — роутер пробует следующий подходящий маршрут,
 * который содержит redirect на `/application/welcome`.
 * @returns true если платформа браузерная, false если нативная
 */
export const webOnlyGuard: CanMatchFn = (): boolean =>
  inject(PlatformDetectorService).isWeb;
