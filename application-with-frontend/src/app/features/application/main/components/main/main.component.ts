import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { UinModalService } from '../../../uin/services/uin-modal.service';

/** Основной shell приложения: таббар + router-outlet для дочерних экранов */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'application-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainApplicationComponent implements OnInit {
  /** Роутер для чтения state навигации */
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
