import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Экран поиска */
@Component({
  imports: [],
  selector: 'application-search',
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchApplicationComponent {}
