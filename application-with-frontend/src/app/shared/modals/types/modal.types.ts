import type { Type } from '@angular/core';

/** Иконки заголовка модального окна */
export enum ModalHeaderIcon {
  /** Анимированная крутилка */
  Preloader = 'preloader',
  /** Зелёная галочка */
  Done = 'done',
  /** Красный крестик */
  Error = 'error',
  /** Синяя информация */
  Info = 'info',
  /** Жёлтый треугольник */
  Warning = 'warning',
}

/**
 * Конфигурация универсального диалогового окна.
 * Generic T — тип данных для компонента, встроенного через `component`.
 */
export interface DialogModalData<T = unknown> {
  // ─── Заголовок ───
  /** Текст заголовка */
  readonly title?: string;
  /** Иконка в заголовке */
  readonly icon?: ModalHeaderIcon;

  // ─── Контент ───
  /** Текст или HTML-строка */
  readonly text?: string;
  /** Центрировать текст */
  readonly textCenter?: boolean;
  /**
   * Произвольный компонент вместо текста.
   * Компонент получает данные через `@Input() public data`.
   */
  readonly component?: Type<unknown>;
  /** Данные для встроенного компонента */
  readonly componentData?: T;

  // ─── Режим ───
  /** true → confirm + cancel, false (по умолчанию) → одна кнопка "Закрыть" */
  readonly isConfirmModal?: boolean;

  // ─── Кнопка подтверждения (confirm) ───
  /** Текст кнопки (по умолчанию «Да») */
  readonly confirmBtnText?: string;
  /** Sync-колбек — модалка закроется автоматически */
  readonly confirmCallback?: () => void;
  /** Async-колбек — модалка НЕ закроется, вызвать dialogRef.close() вручную */
  readonly confirmCallbackAsync?: () => Promise<void>;
  /** Динамическая блокировка кнопки подтверждения */
  readonly isConfirmButtonDisabled?: () => boolean;

  // ─── Кнопка отмены (cancel) ───
  /** Текст кнопки (по умолчанию «Нет») */
  readonly cancelBtnText?: string;
  /** Sync-колбек */
  readonly cancelCallback?: () => void;
  /** Async-колбек */
  readonly cancelCallbackAsync?: () => Promise<void>;

  // ─── Кнопка закрытия (не-confirm режим) ───
  /** Текст кнопки (по умолчанию «Закрыть») */
  readonly closeBtnText?: string;
  /** Колбек при закрытии */
  readonly closeCallback?: () => void;

  // ─── Layout кнопок ───
  /** Расположить кнопки столбиком */
  readonly isFooterButtonsVertically?: boolean;
  /** Поменять confirm и cancel местами */
  readonly isButtonsOrderReversed?: boolean;

  // ─── Поведение ───
  /** Блокировать закрытие по Escape и клику по backdrop */
  readonly preventDialogClose?: boolean;
}
