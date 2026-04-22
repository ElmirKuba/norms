import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Страница «Безопасность» web-составляющей */
@Component({
  imports: [],
  selector: 'web-security',
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityWebComponent {}
