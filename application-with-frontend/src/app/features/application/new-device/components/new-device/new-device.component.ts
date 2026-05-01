import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MOCK_ORPHAN_PEERS } from '../../types/new-device.types';
import type { MockOrphanPeer } from '../../types/new-device.types';

/** Экран нового устройства — список осиротевших собеседников */
@Component({
  imports: [],
  selector: 'application-new-device',
  templateUrl: './new-device.component.html',
  styleUrl: './new-device.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewDeviceApplicationComponent {
  private readonly _router: Router = inject(Router);

  /** Осиротевшие собеседники (мок) */
  public readonly peers: MockOrphanPeer[] = MOCK_ORPHAN_PEERS;

  /** Перейти к профилю пользователя */
  public openProfile(peer: MockOrphanPeer): void {
    void this._router.navigate(['/application/main/user', peer.id]);
  }

  /** Закрыть экран и перейти к чатам */
  public dismiss(): void {
    void this._router.navigate(['/application/main/chats']);
  }
}
