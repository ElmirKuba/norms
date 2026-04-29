import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Футер модального окна: кнопки действий */
@Component({
  selector: 'shared-modal-footer',
  templateUrl: './modal-footer.component.html',
  styleUrl: './modal-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalFooterSharedComponent {
  /** Расположить кнопки вертикально */
  @Input() public vertically: boolean = false;

  /** Поменять порядок кнопок */
  @Input() public reversed: boolean = false;
}
