import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { type BadgeTypeIcons } from '../../types/badge.types';

/** Компонент badge — отображает иконку с визуальным акцентом */
@Component({
  imports: [],
  selector: 'shared-badge',
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeSharedComponent {
  /** Внутреннее значение иконки, устанавливается через @Input setter */
  private _iconType: BadgeTypeIcons | null = null;

  /** Текущий тип иконки badge */
  public get iconType(): BadgeTypeIcons | null {
    return this._iconType;
  }

  /**
   * Устанавливает тип иконки badge.
   * @param value - Тип иконки или null для сброса
   */
  @Input() public set iconType(value: BadgeTypeIcons | null) {
    this._iconType = value;
  }

  /** Получить путь к файлу с иконкой svg */
  public get iconSrcPath(): string {
    // TODO: ElmirKuba 2026-04-23: Подумать, чтобы не только *.svg, а и другие типы/расширения файлов и валидацией
    return `./../../../../assets/images/icons/${this._iconType ?? ''}.svg`;
  }
}
