import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { OnDestroy, OnInit, WritableSignal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import type { Subscription } from 'rxjs';
import { type NavItem, type NavLink } from '../../types/main.types';

/** Основной компонент web-составляющей */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'web-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainWebComponent implements OnInit, OnDestroy {
  /** Состояние мобильного меню-бургера */
  public readonly menuOpen: WritableSignal<boolean> = signal(false);

  /** Список пунктов навигации нижней панели */
  public readonly navItemsFooter: NavLink[] = [
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

  /** Подписка на события роутера для закрытия мобильного меню */
  private _routerSub: Subscription | null = null;

  /** Роутер для подписки на события навигации */
  private readonly _router: Router = inject(Router);

  /** @inheritdoc */
  public ngOnInit(): void {
    this._routerSub = this._router.events
      .pipe(filter((e: unknown): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((): void => {
        this.menuOpen.set(false);
      });
  }

  /** @inheritdoc */
  public ngOnDestroy(): void {
    this._routerSub?.unsubscribe();
  }

  /** Переключает состояние мобильного меню */
  public toggleMenu(): void {
    this.menuOpen.update((v: boolean): boolean => !v);
  }

  /** Переключает цветовую тему интерфейса */
  public toggleTheme(): void {
    // TODO: ElmirKuba 2026-04-22: реализовать переключение темы
    alert('Когда-то в будущем');
  }
}
