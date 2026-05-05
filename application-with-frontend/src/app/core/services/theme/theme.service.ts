import { inject, Injectable, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Ключ хранения пользовательского выбора темы в localStorage */
const THEME_STORAGE_KEY = 'theme';

/**
 * Сервис переключения цветовой темы.
 * Приоритет: localStorage → системная prefers-color-scheme → светлая.
 * Добавляет/убирает класс `.dark` на `<html>`, CSS-переменные реагируют через `:root.dark`.
 * Предназначен для переиспользования в web и native (Capacitor/Electron) платформах.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Реактивный флаг текущей темы (только чтение) */
  public readonly isDark: Signal<boolean>;

  /** Ссылка на document для манипуляций с DOM */
  private readonly _document: Document = inject(DOCUMENT);

  /** Внутреннее состояние — тёмная тема активна */
  private readonly _isDark: WritableSignal<boolean> = signal(false);

  /** Инициализирует readonly-обёртку над внутренним сигналом */
  public constructor() {
    this.isDark = this._isDark.asReadonly();
  }

  /**
   * Инициализирует тему при старте приложения.
   * Вызывается через APP_INITIALIZER до первого рендера.
   */
  public init(): void {
    const saved: string | null = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark: boolean =
      this._document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;

    this._apply(saved !== null ? saved === 'dark' : prefersDark);

    // Следим за системной темой — срабатывает только если пользователь не выбрал явно
    this._document.defaultView
      ?.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e: MediaQueryListEvent): void => {
        if (localStorage.getItem(THEME_STORAGE_KEY) === null) {
          this._apply(e.matches);
        }
      });
  }

  /** Переключает тему и сохраняет выбор пользователя в localStorage */
  public toggle(): void {
    const next: boolean = !this._isDark();
    localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    this._apply(next);
  }

  /**
   * Применяет тему: обновляет сигнал и класс на `<html>`.
   * @param isDark - true для тёмной темы
   */
  private _apply(isDark: boolean): void {
    this._isDark.set(isDark);
    this._document.documentElement.classList.toggle('dark', isDark);
  }
}
