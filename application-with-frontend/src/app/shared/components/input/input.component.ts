import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';

/** Переиспользуемый компонент поля ввода */
@Component({
  selector: 'shared-input',
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputSharedComponent {
  /** Тип поля — при 'password' показывается кнопка показа/скрытия */
  @Input() public type: 'text' | 'password' = 'text';

  /** Плейсхолдер */
  @Input() public placeholder: string = '';

  /** Текущее значение */
  @Input() public value: string = '';

  /** Максимальная длина (символов) */
  @Input() public maxlength: number | null = null;

  /** Эмит при изменении значения */
  @Output() public readonly valueChange: EventEmitter<string> = new EventEmitter<string>();

  /** true — пароль отображается открытым текстом */
  protected readonly _isPasswordVisible: WritableSignal<boolean> = signal(false);

  /** Фактический тип инпута с учётом переключателя видимости */
  protected get _effectiveType(): 'text' | 'password' {
    if (this.type !== 'password') return 'text';
    return this._isPasswordVisible() ? 'text' : 'password';
  }

  /**
   * Обрабатывает ввод пользователя.
   * @param event - событие ввода из нативного инпута.
   */
  public onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  /** Переключает видимость пароля. */
  protected _togglePasswordVisibility(): void {
    this._isPasswordVisible.update((v: boolean): boolean => !v);
  }
}
