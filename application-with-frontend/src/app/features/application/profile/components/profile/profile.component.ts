import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionKickedService } from '../../../main/services/session-kicked.service';
import { MainApplicationComponent } from '../../../main/components/main/main.component';

/** Экран профиля пользователя */
@Component({
  imports: [],
  selector: 'application-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileApplicationComponent {
  /** Сервис модалки кика сессии */
  private readonly _sessionKicked: SessionKickedService = inject(SessionKickedService);

  /** Shell основного экрана для управления баннером */
  private readonly _mainShell: MainApplicationComponent = inject(MainApplicationComponent);

  /** [МОК] Симулировать получение WSS события session_kicked */
  public mockSessionKick(): void {
    this._sessionKicked.showKickedModal();
  }

  /** [МОК] Симулировать получение WSS события password_reset_via_recovery */
  public mockPasswordReset(): void {
    this._mainShell.mockPasswordReset();
  }
}
