import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InputSharedComponent } from '../../../../../shared/components/input/input.component';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';
import { AuthApiService } from '../../services/auth-api.service';
import type { ApiPlatform, AuthAccountResponse } from '../../services/auth-api.service';
import { TokenStorageService } from '../../../../../core/services/storage/token-storage.service';
import { WssService } from '../../../../../core/services/wss/wss.service';
import { PlatformDetectorService, AppPlatform } from '../../../../../core/services/platform/platform.service';
import { LocalDbService } from '../../../../../core/services/local-db/local-db.service';

/** Экран входа в аккаунт */
@Component({
  imports: [InputSharedComponent, ButtonSharedComponent],
  selector: 'application-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginApplicationComponent {
  /** Логин: UIN (цифры) или username */
  protected readonly _login: WritableSignal<string> = signal('');

  /** Пароль */
  protected readonly _password: WritableSignal<string> = signal('');

  /** Текст ошибки от API или null */
  protected readonly _error: WritableSignal<string | null> = signal(null);

  /** Запрос в процессе выполнения */
  protected readonly _isLoading: WritableSignal<boolean> = signal(false);

  /** Кнопка активна когда оба поля заполнены и нет активного запроса */
  protected get _isValid(): boolean {
    return this._login().trim().length > 0 && this._password().length >= 8 && !this._isLoading();
  }

  /** Роутер для навигации между экранами */
  private readonly _router: Router = inject(Router);

  /** API-сервис для авторизации */
  private readonly _authApi: AuthApiService = inject(AuthApiService);

  /** Хранилище токенов текущей сессии */
  private readonly _tokenStorage: TokenStorageService = inject(TokenStorageService);

  /** WSS-сервис — подключается после успешного входа */
  private readonly _wss: WssService = inject(WssService);

  /** Сервис определения платформы */
  private readonly _platform: PlatformDetectorService = inject(PlatformDetectorService);

  /** Локальная БД — инициализируется после входа */
  private readonly _localDb: LocalDbService = inject(LocalDbService);

  /** Выполняет вход и при успехе переходит в main */
  public onSubmit(): void {
    if (!this._isValid) return;

    this._isLoading.set(true);
    this._error.set(null);

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    this._authApi.authAccount({
      login: this._login().trim(),
      password: this._password(),
      system_name: this._resolveSystemName(),
      platform: this._resolvePlatform(),
    }).subscribe({
      /* eslint-enable @typescript-eslint/naming-convention */
      next: (response: AuthAccountResponse): void => {
        this._tokenStorage.store(response.session.access_token, response.session.refresh_token);
        void this._localDb.initialize(response.account.id)
          .catch((err: unknown) => { console.error('[Login] DB init failed:', err); })
          .finally((): void => {
            this._wss.connect();
            void this._router.navigate(['/application/main'], { replaceUrl: true });
          });
      },
      error: (err: unknown): void => {
        this._isLoading.set(false);
        this._error.set(this._resolveError(err));
      },
    });
  }

  /** Переход на экран восстановления пароля */
  public onForgotPassword(): void {
    void this._router.navigate(['/application/auth/recovery']);
  }

  /**
   * Определяет человекочитаемое имя устройства по платформе.
   * @returns Системное имя устройства.
   */
  private _resolveSystemName(): string {
    switch (this._platform.platform) {
      case AppPlatform.IOS: return 'iPhone';
      case AppPlatform.ANDROID: return 'Android';
      case AppPlatform.ELECTRON_WINDOWS: return 'Windows PC';
      case AppPlatform.ELECTRON_MACOS: return 'Mac';
      case AppPlatform.ELECTRON_LINUX: return 'Linux PC';
      case AppPlatform.WEB: return 'Web';
    }
  }

  /**
   * Маппит AppPlatform в значения принимаемые бэкендом.
   * @returns Платформа для API.
   */
  private _resolvePlatform(): ApiPlatform {
    switch (this._platform.family) {
      case 'mobile': return this._platform.isIOS ? 'ios' : 'android';
      case 'desktop': return 'electron';
      case 'web': return 'electron';
    }
  }

  /**
   * Преобразует HTTP-ошибку в человекочитаемый текст.
   * @param err - Ошибка из subscribe.
   * @returns Текст ошибки для отображения.
   */
  private _resolveError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'Неверный логин или пароль.';
      if (err.status === 403) return 'Достигнут лимит устройств. Удалите одно из них в настройках.';
      if (err.status === 423) return 'Слишком много попыток входа. Подождите немного и попробуйте снова.';
    }
    return 'Что-то пошло не так. Попробуйте снова.';
  }
}
