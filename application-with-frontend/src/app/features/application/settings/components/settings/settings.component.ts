import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../auth/services/auth-api.service';
import { TokenStorageService } from '../../../../../core/services/storage/token-storage.service';
import { WssService } from '../../../../../core/services/wss/wss.service';

/** Экран настроек */
@Component({
  imports: [RouterLink],
  selector: 'application-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsApplicationComponent {
  /** API-клиент для аккаунта. */
  private readonly _authApi: AuthApiService = inject(AuthApiService);

  /** Хранилище токенов. */
  private readonly _tokenStorage: TokenStorageService = inject(TokenStorageService);

  /** Роутер. */
  private readonly _router: Router = inject(Router);

  /** WSS-сервис — отключается при выходе из аккаунта. */
  private readonly _wss: WssService = inject(WssService);

  /** Выход из аккаунта: сообщает серверу, чистит токены, возвращает на стартовый экран. */
  public logout(): void {
    this._authApi.logout().subscribe({
      next: (): void => { this._doLogout(); },
      error: (): void => { this._doLogout(); },
    });
  }

  /** Очищает локальное состояние и редиректит на welcome. */
  private _doLogout(): void {
    this._wss.disconnect();
    this._tokenStorage.clear();
    void this._router.navigate(['/application/welcome']);
  }
}
