import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { type NavItem } from '../../main.types';

/** Основной компонент web-составляющей */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'web-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainWebComponent {
  /** Список пунктов навигации верхней панели */
  public readonly navItemsFooter: NavItem[] = [
    {
      kind: 'link',
      label: 'Главная',
      path: 'welcome',
    },
    {
      kind: 'link',
      label: 'О проекте',
      path: 'about',
    },
    {
      kind: 'link',
      label: 'Безопасность',
      path: 'security',
    },
  ];

  /** Список пунктов навигации верхней панели */
  public readonly navItemsHeader: NavItem[] = [
    ...this.navItemsFooter,
    {
      kind: 'button',
      imgSrc: './../../../../../../assets/images/buttons/theme-toggle.svg',
      imgAlt: 'Переключение цветовой схемы',
      onClick: (): void => {
        this.toggleTheme();
      },
    },
  ];

  /** Переключает цветовую тему интерфейса */
  public toggleTheme(): void {
    // TODO: ElmirKuba 2026-04-22: реализовать переключение темы
    alert('Когда-то в будущем');
  }
}
