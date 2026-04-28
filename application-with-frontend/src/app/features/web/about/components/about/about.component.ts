import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BadgeSharedComponent } from '../../../../../shared/components/badge/badge.component';
import { BadgeTypeIcons } from '../../../../../shared/types/badge.types';
import { type FeatureCard } from '../../types/about.types';

/** Страница «О проекте» web-составляющей */
@Component({
  imports: [BadgeSharedComponent],
  selector: 'web-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutWebComponent {
  /** Ссылка на BadgeTypeIcons — нужна для доступа к enum из шаблона */
  public readonly badgeTypeIcons: typeof BadgeTypeIcons = BadgeTypeIcons;

  /**
   * Карточки с ключевыми характеристиками продукта.
   * TODO: заменить imgSrc на реальные SVG-иконки в assets/images/icons/features/
   */
  public readonly features: FeatureCard[] = [
    {
      imgSrc: 'assets/images/icons/features/no-tracking.svg',
      imgAlt: 'Иконка без слежки',
      title: 'Без лишнего',
      description: 'Никакого номера телефона или email. Только никнейм от человека, которому доверяешь.',
    },
    {
      imgSrc: 'assets/images/icons/features/closed-circle.svg',
      imgAlt: 'Иконка закрытого круга',
      title: 'Закрытый круг',
      description: 'Регистрация только по приглашениям. Вы контролируете, кто рядом.',
    },
    {
      imgSrc: 'assets/images/icons/features/honest.svg',
      imgAlt: 'Иконка честности',
      title: 'Сделано честно',
      description: 'Никакой рекламы и аналитики. Только продукт, которому можно доверять.',
    },
  ];
}
