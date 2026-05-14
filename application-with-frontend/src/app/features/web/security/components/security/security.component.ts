import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BadgeSharedComponent } from '../../../../../shared/components/badge/badge.component';
import { BadgeTypeIcons } from '../../../../../shared/types/badge.types';
import { type SecurityFeatureCard } from '../../types/security.types';

/** Страница «Безопасность» web-составляющей */
@Component({
  imports: [BadgeSharedComponent],
  selector: 'web-security',
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityWebComponent {
  /** Ссылка на BadgeTypeIcons — нужна для доступа к enum из шаблона */
  public readonly badgeTypeIcons: typeof BadgeTypeIcons = BadgeTypeIcons;

  /** Карточки с аспектами безопасности. */
  public readonly features: SecurityFeatureCard[] = [
    {
      imgSrc: 'assets/images/icons/features/e2e-encryption.svg',
      imgAlt: 'Иконка сквозного шифрования',
      title: 'Сквозное шифрование',
      description: 'ECDH для обмена ключами, AES-256-GCM для шифрования. Ключи создаются на устройстве и никогда не покидают его.',
      isDark: true,
    },
    {
      imgSrc: 'assets/images/icons/features/server-transit.svg',
      imgAlt: 'Иконка транзитного сервера',
      title: 'Сервер — только транзит',
      description: 'Сервер передаёт зашифрованные пакеты, но не хранит и не читает содержимое переписки.',
      isDark: false,
    },
    {
      imgSrc: 'assets/images/icons/features/keys-on-device.svg',
      imgAlt: 'Иконка ключей на устройстве',
      title: 'Ключи только на устройстве',
      description: 'Мастер-ключ хранится в Keychain/Keystore. Смена пароля не ломает существующие чаты.',
      isDark: false,
    },
  ];
}
