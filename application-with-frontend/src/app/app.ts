import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TestComponent12345 } from './components/test';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TestComponent12345],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('norms');
}
