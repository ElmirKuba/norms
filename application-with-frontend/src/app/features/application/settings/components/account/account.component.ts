import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../auth/services/auth-api.service';
import type { ReadSelfResponse } from '../../../auth/services/auth-api.service';
import { AccountApiService } from '../../services/account-api.service';

/** Подэкран настроек — Аккаунт */
@Component({
  imports: [RouterLink, FormsModule],
  selector: 'application-settings-account',
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAccountComponent implements OnInit {
  /** UIN текущего пользователя. */
  public readonly uin: WritableSignal<string> = signal('');

  /** Псевдоним (display name) или null если не задан. */
  public readonly nickname: WritableSignal<string | null> = signal(null);

  /** Username текущего пользователя. */
  public readonly username: WritableSignal<string | null> = signal(null);

  /** Режим редактирования псевдонима. */
  public editingNickname: boolean = false;

  /** Черновик редактируемого псевдонима. */
  public nicknameDraft: string = '';

  /** Идёт ли сохранение псевдонима. */
  public savingNickname: boolean = false;

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** API-клиент аккаунта */
  private readonly _authApi: AuthApiService = inject(AuthApiService);

  /** API для обновления аккаунта */
  private readonly _accountApi: AccountApiService = inject(AccountApiService);

  /** Change detector для OnPush */
  private readonly _cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  /** @inheritdoc */
  public ngOnInit(): void {
    this._authApi.readSelf().subscribe({
      next: (data: ReadSelfResponse): void => {
        this.uin.set(data.uin ?? '');
        this.nickname.set(data.nickname);
        this.username.set(data.username);
      },
    });
  }

  /** Начать редактирование псевдонима. */
  public startEditNickname(): void {
    this.nicknameDraft = this.nickname() ?? '';
    this.editingNickname = true;
  }

  /** Отменить редактирование псевдонима. */
  public cancelEditNickname(): void {
    this.editingNickname = false;
    this.nicknameDraft = '';
  }

  /** Сохранить псевдоним через API. */
  public saveNickname(): void {
    const draft = this.nicknameDraft.trim();
    const newNickname = draft.length > 0 ? draft : null;
    this.savingNickname = true;
    this.editingNickname = false;
    this._cdr.detectChanges();

    this._accountApi.updateAccount({ nickname: newNickname }).subscribe({
      next: (): void => {
        this.nickname.set(newNickname);
        this.savingNickname = false;
        this.nicknameDraft = '';
        this._cdr.detectChanges();
      },
      error: (): void => {
        this.editingNickname = true;
        this.savingNickname = false;
        this._cdr.detectChanges();
      },
    });
  }

  /** Назад к настройкам */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }
}
