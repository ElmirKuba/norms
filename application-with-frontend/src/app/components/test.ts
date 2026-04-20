import { Component, inject, signal } from '@angular/core';
import { PlatformDetectorService } from '../services/platform/platform.service';

@Component({
  selector: 'app-test',
  imports: [],
  template: ` <h1>Платформа: {{ platform.platform }}</h1>

    @if (platform.isMobile) {
      <p>Мобильное приложение</p>
    }

    @if (platform.isElectron) {
      <p>Десктоп: {{ platform.platform }}</p>
    }

    @if (platform.isWeb) {
      <p>Скачайте приложение!</p>
    }`,
})
export class TestComponent12345 {
  platform = inject(PlatformDetectorService);
}
