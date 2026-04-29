import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { Location } from '@angular/common';
import { RouterOutlet } from '@angular/router';

/** Shell-компонент для экранов авторизации: header с кнопкой «назад» и переключением темы */
@Component({
  imports: [RouterOutlet],
  selector: 'application-auth-shell',
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShellComponent {
  public constructor(private readonly _location: Location) {}

  /** Переход на предыдущий экран */
  public goBack(): void {
    this._location.back();
  }

  /** Переключение темы (TODO) */
  public toggleTheme(): void {
    // TODO: реализовать переключение темы
  }
}
