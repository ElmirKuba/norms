import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApiService } from '../../../auth/services/auth-api.service';
import type { ReadSelfResponse } from '../../../auth/services/auth-api.service';

/** Экран профиля пользователя */
@Component({
  imports: [],
  selector: 'application-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileApplicationComponent implements OnInit {
  /** UIN текущего пользователя. */
  public readonly uin: WritableSignal<string> = signal('');

  /** Псевдоним (display name) или null. */
  public readonly nickname: WritableSignal<string | null> = signal(null);

  /** Username текущего пользователя. */
  public readonly username: WritableSignal<string | null> = signal(null);

  /** Отображаемое имя: nickname > @username > UIN XXXXX. */
  public readonly displayName: WritableSignal<string> = signal('');

  /** Инициалы для аватара (до 2 символов). */
  public readonly initials: WritableSignal<string> = signal('?');

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** API-клиент аккаунта */
  private readonly _authApi: AuthApiService = inject(AuthApiService);

  /** Перейти на экран редактирования аккаунта (псевдоним). */
  public goToAccount(): void {
    void this._router.navigate(['/application/main/settings/account']);
  }

  /** @inheritdoc */
  public ngOnInit(): void {
    this._authApi.readSelf().subscribe({
      next: (data: ReadSelfResponse): void => {
        const uinStr = data.uin ?? '';
        this.uin.set(uinStr);
        this.nickname.set(data.nickname);
        this.username.set(data.username);

        if (data.nickname !== null) {
          this.displayName.set(data.nickname);
          const words = data.nickname.trim().split(/\s+/);
          const first = words[0]?.[0]?.toUpperCase() ?? '?';
          const second = words[1]?.[0]?.toUpperCase() ?? '';
          this.initials.set(first + second);
        } else if (data.username !== null) {
          this.displayName.set(`@${data.username}`);
          this.initials.set(data.username[0]?.toUpperCase() ?? '?');
        } else {
          this.displayName.set(uinStr.length > 0 ? `UIN ${uinStr}` : '—');
          this.initials.set(uinStr[0] ?? '?');
        }
      },
    });
  }


}
