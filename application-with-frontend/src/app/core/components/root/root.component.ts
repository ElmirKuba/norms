import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Корневой компонент приложения — точка входа Angular */
@Component({
  selector: 'root-component',
  imports: [RouterOutlet],
  templateUrl: './root.component.html',
  styleUrl: './root.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RootComponent {}
