import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Основной компонент web-составляющей */
@Component({
  imports: [RouterOutlet, RouterLink],
  selector: 'web-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
})
export class MainWebComponent {}
