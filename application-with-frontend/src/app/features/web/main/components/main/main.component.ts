import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

type NavLink = {
  kind: 'link';
  label: string;
  path: string;
};

type NavButton = {
  kind: 'button';
  imgSrc: string;
  imgAlt: string;
  onClick: () => void;
};

type NavItem = NavLink | NavButton;

/** Основной компонент web-составляющей */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'web-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
})
export class MainWebComponent {
  readonly navItems: NavItem[] = [
    { kind: 'link', label: 'Главная', path: 'welcome' },
    { kind: 'link', label: 'О проекте', path: 'about' },
    { kind: 'link', label: 'Безопасность', path: 'security' },
    {
      kind: 'button',
      imgSrc: './../../../../../../assets/images/buttons/theme-toggle.svg',
      imgAlt: 'Переключение цветовой схемы',
      onClick: () => this.toggleTheme(),
    },
  ];

  toggleTheme(): void {
    console.log('toggleTheme');
  }
}
