import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { BadgeSharedComponent } from '../../../../../shared/components/badge/badge.component';
import { BadgeTypeIcons } from '../../../../../shared/types/badge.types';
import { type DownloadButtonItem } from '../../types/welcome.types';
import { NgClass } from '@angular/common';
import {
  OperatingSystem,
  PlatformDetectorService,
} from '../../../../../core/services/platform/platform.service';

/** Страница «Главная» web-составляющей */
@Component({
  imports: [BadgeSharedComponent, NgClass],
  selector: 'web-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeWebComponent {
  /** Ссылка на BadgeTypeIcons — нужна для доступа к enum из шаблона */
  public readonly badgeTypeIcons: typeof BadgeTypeIcons = BadgeTypeIcons;

  /** Кнопка загрузки приложения */
  public readonly downloadButtons: DownloadButtonItem[] = [
    {
      osType: OperatingSystem.IOS,
      label: 'Скачать в',
      name: 'App Store',
      downloadLink: null,
    },
    {
      osType: OperatingSystem.ANDROID,
      label: 'Скачать для',
      name: 'Android',
      downloadLink: null,
    },
    {
      osType: OperatingSystem.WINDOWS,
      label: 'Скачать для',
      name: 'Windows',
      downloadLink: null,
    },
    {
      osType: OperatingSystem.MACOS,
      label: 'Скачать для',
      name: 'macOS',
      downloadLink: null,
    },
    {
      osType: OperatingSystem.LINUX,
      label: 'Скачать для',
      name: 'GNU/Linux',
      downloadLink: null,
    },
  ];

  public constructor(
    @Inject(PlatformDetectorService)
    private readonly _platformDetectorService: PlatformDetectorService,
  ) {}

  /**
   * Получить путь к иконке ОС.
   * @param osType - Операционная система.
   * @returns Путь к SVG-иконке.
   */
  public iconSrcPath(osType: OperatingSystem): string {
    return `./../../../../../../assets/images/icons/os/${osType}-icon.svg`;
  }

  /** Геттер для получения текущей ОС из сервиса (чтобы использовать в шаблоне) */
  public get currentOs(): OperatingSystem {
    return this._platformDetectorService.os;
  }
}
