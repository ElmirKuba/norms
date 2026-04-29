import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Контентная область модального окна */
@Component({
  selector: 'shared-modal-content',
  template: '<div class="modal-content"><ng-content /></div>',
  styles: [':host { display: block; margin-top: 8px; } .modal-content { font-size: 14px; font-weight: 400; color: #8e8e93; line-height: 1.5; text-align: center; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalContentSharedComponent {}
