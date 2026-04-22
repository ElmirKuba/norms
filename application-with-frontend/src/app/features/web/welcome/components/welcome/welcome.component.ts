import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Страница «Главная» web-составляющей */
@Component({
  imports: [],
  selector: 'web-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeWebComponent {}
