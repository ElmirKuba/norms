import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/** Подэкран настроек — Аккаунт */
@Component({
  imports: [RouterLink],
  selector: 'application-settings-account',
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAccountComponent {
  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** Назад к настройкам */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }
}
