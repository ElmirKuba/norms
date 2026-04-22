import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Страница «О проекте» web-составляющей */
@Component({
  imports: [],
  selector: 'web-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutWebComponent {}
