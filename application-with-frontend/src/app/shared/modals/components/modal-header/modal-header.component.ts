import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ModalHeaderIcon } from '../../types/modal.types';

/** Заголовок модального окна: иконка + title через ng-content */
@Component({
  selector: 'shared-modal-header',
  templateUrl: './modal-header.component.html',
  styleUrl: './modal-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalHeaderSharedComponent {
  /** Иконка заголовка (опционально) */
  @Input() public icon: ModalHeaderIcon | undefined = undefined;

  /** Enum иконок — доступен в шаблоне */
  public readonly ModalHeaderIcon: typeof ModalHeaderIcon = ModalHeaderIcon;
}
