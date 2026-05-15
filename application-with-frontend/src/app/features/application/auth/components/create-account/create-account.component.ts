import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InputSharedComponent } from '../../../../../shared/components/input/input.component';
import { ButtonSharedComponent } from '../../../../../shared/components/button/button.component';
import { AuthApiService } from '../../services/auth-api.service';
import type { ApiPlatform, CreateAccountResponse } from '../../services/auth-api.service';
import { TokenStorageService } from '../../../../../core/services/storage/token-storage.service';
import { WssService } from '../../../../../core/services/wss/wss.service';
import { PlatformDetectorService, AppPlatform } from '../../../../../core/services/platform/platform.service';
import { LocalDbService } from '../../../../../core/services/local-db/local-db.service';

/** Экран создания аккаунта — ввод пароля */
@Component({
  imports: [InputSharedComponent, ButtonSharedComponent],
  selector: 'application-create-account',
  templateUrl: './create-account.component.html',
  styleUrl: './create-account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateAccountApplicationComponent {
  /** Введённый пароль */
  protected readonly _password: WritableSignal<string> = signal('');

  /** Текст ошибки от API или null */
  protected readonly _error: WritableSignal<string | null> = signal(null);

  /** Запрос в процессе выполнения */
  protected readonly _isLoading: WritableSignal<boolean> = signal(false);

  /** Кнопка активна при минимум 8 символах и нет активного запроса */
  protected get _isValid(): boolean {
    return this._password().length >= 8 && !this._isLoading();
  }

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** API-сервис для регистрации аккаунта */
  private readonly _authApi: AuthApiService = inject(AuthApiService);

  /** Хранилище токенов текущей сессии */
  private readonly _tokenStorage: TokenStorageService = inject(TokenStorageService);

  /** WSS-сервис — подключается после успешной регистрации */
  private readonly _wss: WssService = inject(WssService);

  /** Сервис определения платформы */
  private readonly _platform: PlatformDetectorService = inject(PlatformDetectorService);

  /** Локальная БД — инициализируется после регистрации */
  private readonly _localDb: LocalDbService = inject(LocalDbService);

  /** Инвайт-код, переданный со screen invite-code через router state */
  private readonly _inviteCode: string | undefined;

  public constructor() {
    // Angular router.navigate({ state: {...} }) помещает state в window.history.state
    const state = window.history.state as Record<string, unknown>;
    const code = state['inviteCode'];
    this._inviteCode = typeof code === 'string' ? code : undefined;
  }

  /** Создаёт аккаунт и переходит в main при успехе */
  public onSubmit(): void {
    if (!this._isValid) return;

    this._isLoading.set(true);
    this._error.set(null);

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    this._authApi.createAccount({
      password: this._password(),
      ...(this._inviteCode !== undefined ? { invite_code: this._inviteCode } : {}),
      system_name: this._resolveSystemName(),
      platform: this._resolvePlatform(),
    }).subscribe({
      /* eslint-enable @typescript-eslint/naming-convention */
      next: (response: CreateAccountResponse): void => {
        this._tokenStorage.store(response.session.access_token, response.session.refresh_token);
        void this._localDb.initialize(response.account.id).then((): void => {
          this._wss.connect();
          void this._router.navigate(['/application/main'], {
            replaceUrl: true,
            state: { pendingUin: true },
          });
        });
      },
      error: (err: unknown): void => {
        this._isLoading.set(false);
        this._error.set(this._resolveError(err));
      },
    });
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
   * Маппит AppPlatform в значения, принимаемые бэкендом.
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
      if (err.status === 404 || err.status === 410) return 'Код приглашения недействителен. Вернитесь и попробуйте другой.';
      if (err.status === 409) return 'Код приглашения уже был использован.';
      if (err.status === 400) return 'Для регистрации требуется код приглашения.';
    }
    return 'Что-то пошло не так. Попробуйте снова.';
  }
}
