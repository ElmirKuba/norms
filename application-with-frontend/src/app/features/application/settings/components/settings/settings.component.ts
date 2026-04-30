import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Экран настроек */
@Component({
  imports: [],
  selector: 'application-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsApplicationComponent {}
