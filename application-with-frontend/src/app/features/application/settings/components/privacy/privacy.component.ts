import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Подэкран настроек — Приватность */
@Component({
  imports: [],
  selector: 'application-settings-privacy',
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPrivacyComponent {
  private readonly _router: Router = inject(Router);

  /** Назад к настройкам */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }
}
