import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UinModalService } from '../../../uin/services/uin-modal.service';

/** Основной экран приложения (мессенджер): список чатов, нав-бар */
@Component({
  imports: [],
  selector: 'application-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainApplicationComponent implements OnInit {
  /** Роутер для чтения state навигации и дальнейших переходов */
  private readonly _router: Router = inject(Router);

  /** Сервис UIN-модалок */
  private readonly _uinModal: UinModalService = inject(UinModalService);

  /** @inheritdoc */
  public ngOnInit(): void {
    const state = this._router.lastSuccessfulNavigation()?.extras.state as Record<string, unknown> | null | undefined;
    if (state?.['pendingUin'] === true) {
      this._uinModal.openUinPending((): void => {
        void this._router.navigate(['/application/uin/assigned']);
      });
    }
  }
}
