import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Переиспользуемый компонент кнопки */
@Component({
  selector: 'shared-button',
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonSharedComponent {
  /** Вариант отображения */
  @Input() public variant: 'primary' | 'secondary' = 'primary';

  /** Отключённое состояние */
  @Input() public disabled: boolean = false;

  /** Клик по кнопке */
  @Output() public readonly clicked: EventEmitter<void> = new EventEmitter<void>();
}
