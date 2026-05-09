import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SecurityAlertsComponent } from '../security-alerts/security-alerts.component';

/** Корневой компонент приложения — точка входа Angular */
@Component({
  selector: 'root-component',
  imports: [RouterOutlet, SecurityAlertsComponent],
  templateUrl: './root.component.html',
  styleUrl: './root.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RootComponent {}
