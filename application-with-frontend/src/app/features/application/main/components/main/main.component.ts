import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Основной компонент application-составляющей */
@Component({
  imports: [],
  selector: 'application-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainApplicationComponent {}
