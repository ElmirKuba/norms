import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Основной компонент продукта */
@Component({
  selector: 'root-component',
  imports: [RouterOutlet],
  templateUrl: './root.component.html',
  styleUrl: './root.component.scss',
})
export class RootComponent {}
