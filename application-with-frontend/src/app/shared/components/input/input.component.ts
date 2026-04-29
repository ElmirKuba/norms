import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Переиспользуемый компонент поля ввода */
@Component({
  selector: 'shared-input',
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputSharedComponent {
  /** Тип поля */
  @Input() public type: 'text' | 'password' = 'text';

  /** Плейсхолдер */
  @Input() public placeholder: string = '';

  /** Текущее значение */
  @Input() public value: string = '';

  /** Эмит при изменении значения */
  @Output() public readonly valueChange: EventEmitter<string> = new EventEmitter<string>();

  /**
   * Обрабатывает ввод пользователя
   * @param event - событие ввода из нативного инпута
   */
  public onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
