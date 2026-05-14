import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../../shared/modals/constants/modal.constants';
import { InviteSuccessModalComponent } from '../invite-success-modal/invite-success-modal.component';
import type { InviteSuccessModalData } from '../invite-success-modal/invite-success-modal.component';
import { InviteApiService } from '../../../auth/services/invite-api.service';
import type { InviteCode, ReadReferralsResponse, ReferralPerson } from '../../../auth/services/invite-api.service';
import { AuthApiService } from '../../../auth/services/auth-api.service';
import type { ReadSelfResponse } from '../../../auth/services/auth-api.service';
import { ClipboardService } from '../../../../../core/services/clipboard/clipboard.service';

/** Инвайт для отображения в списке. */
interface InviteItem {
  /** ID инвайта. */
  id: string;
  /** Отформатированный код (XXXX-XXXX-XX). */
  code: string;
  /** Дата истечения (читаемая строка). */
  expiresAt: string;
}

/** Данные инвайтера для отображения. */
interface InviterItem {
  /** Основная строка: nickname / @username / UIN XXXX / 'Свободная регистрация'. */
  name: string;
  /** Вторая строка: @username · UIN XXXX или только UIN XXXX (null если нечего добавить). */
  meta: string | null;
}

/** Приглашённый пользователь для отображения. */
interface InviteeItem {
  /** Ключ для track. */
  id: string;
  /** Инициалы для аватара. */
  initials: string;
  /** Цвет фона аватара. */
  avatarColor: string;
  /** Отображаемое имя (UIN или @username). */
  name: string;
  /** UIN для строки метаданных. */
  uin: string;
  /** Дата приглашения (читаемая строка). */
  invitedAt: string;
}

const AVATAR_COLORS = ['#7C6BFF', '#4AB8A0', '#E87B4A', '#5B9CF6', '#C26BE8'] as const;

/** Результат forkJoin в ngOnInit. */
interface InitData {
  /** Данные своего аккаунта. */
  self: ReadSelfResponse;
  /** Активные инвайт-коды. */
  codes: InviteCode[];
  /** Реферальные связи. */
  referrals: ReadReferralsResponse;
}

/** Подэкран настроек — Инвайты */
@Component({
  imports: [],
  selector: 'application-settings-invites',
  templateUrl: './invites.component.html',
  styleUrl: './invites.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsInvitesComponent implements OnInit {
  /** Количество оставшихся инвайтов. */
  public readonly remaining: WritableSignal<number> = signal(0);

  /** Активные коды. */
  public readonly codes: WritableSignal<InviteItem[]> = signal([]);

  /** Кто пригласил меня. */
  public readonly invitedBy: WritableSignal<InviterItem> = signal({ name: '', meta: null });

  /** Кого я пригласил. */
  public readonly invitedUsers: WritableSignal<InviteeItem[]> = signal([]);

  /** ID скопированного кода. */
  public readonly copiedId: WritableSignal<string | null> = signal(null);

  /** Роутер для навигации. */
  private readonly _router: Router = inject(Router);

  /** Сервис диалогов Angular Material. */
  private readonly _dialog: MatDialog = inject(MatDialog);

  /** API-клиент для инвайтов. */
  private readonly _inviteApi: InviteApiService = inject(InviteApiService);

  /** API-клиент для аккаунта (нужен invites_remaining). */
  private readonly _authApi: AuthApiService = inject(AuthApiService);

  /** Change detector для принудительного обновления при OnPush (Promise-коллбэк вне zone.js). */
  /** Сервис буфера обмена. */
  private readonly _clipboard: ClipboardService = inject(ClipboardService);

  /** @inheritdoc */
  public ngOnInit(): void {
    forkJoin({
      self: this._authApi.readSelf(),
      codes: this._inviteApi.readList(),
      referrals: this._inviteApi.readReferrals(),
    }).subscribe({
      next: ({ self, codes, referrals }: InitData): void => {
        this.remaining.set(self.invites_remaining);
        this.codes.set(codes.map((c: InviteCode): InviteItem => this._mapCode(c)));
        this.invitedBy.set(this._formatInviter(referrals.inviter));
        this.invitedUsers.set(
          referrals.invitees.map((p: ReferralPerson, i: number): InviteeItem =>
            this._mapInvitee(p, i),
          ),
        );
      },
    });
  }

  /** Назад к настройкам. */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }

  /** Создаёт инвайт-код через API и открывает модалку успеха. */
  public createCode(): void {
    if (this.remaining() <= 0) return;
    this._inviteApi.create().subscribe({
      next: (invite: InviteCode): void => {
        const item = this._mapCode(invite);
        this.codes.update((list: InviteItem[]): InviteItem[] => [...list, item]);
        this.remaining.update((n: number): number => n - 1);
        this._dialog.open<InviteSuccessModalComponent, InviteSuccessModalData>(
          InviteSuccessModalComponent,
          { ...MODAL_BOTTOM_SHEET_PARAMS, data: { code: item.code } },
        );
      },
    });
  }

  /**
   * Отзывает инвайт-код через API.
   * @param id - ID кода.
   */
  public revokeCode(id: string): void {
    this._inviteApi.revoke(id).subscribe({
      next: (): void => {
        this.codes.update((list: InviteItem[]): InviteItem[] =>
          list.filter((c: InviteItem): boolean => c.id !== id),
        );
        this.remaining.update((n: number): number => n + 1);
      },
    });
  }

  /**
   * Копирует код в буфер обмена.
   * @param code - Инвайт для копирования.
   */
  public copyCode(code: InviteItem): void {
    this.copiedId.set(code.id);
    void this._clipboard.write(code.code);
    setTimeout((): void => { this.copiedId.set(null); }, 1500);
  }

  /**
   * Преобразует InviteCode из API в InviteItem для отображения.
   * @param c - Инвайт из API.
   * @returns InviteItem.
   */
  private _mapCode(c: InviteCode): InviteItem {
    const raw = c.code;
    return {
      id: c.id,
      code: `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`,
      expiresAt: new Date(c.expires_at).toLocaleDateString('ru-RU'),
    };
  }

  /**
   * Форматирует инвайтера для строки «Кто меня пригласил».
   * @param inviter - Данные инвайтера или null.
   * @returns Строка для отображения.
   */
  private _formatInviter(inviter: ReferralPerson | null): InviterItem {
    if (inviter === null) return { name: 'Свободная регистрация', meta: null };

    const metaParts: string[] = [];
    if (inviter.username !== null) metaParts.push(`@${inviter.username}`);
    if (inviter.uin !== null) metaParts.push(`UIN ${inviter.uin}`);
    const meta = metaParts.length > 0 ? metaParts.join(' · ') : null;

    if (inviter.nickname !== null) return { name: inviter.nickname, meta };
    if (inviter.username !== null) return { name: `@${inviter.username}`, meta: inviter.uin !== null ? `UIN ${inviter.uin}` : null };
    if (inviter.uin !== null) return { name: `UIN ${inviter.uin}`, meta: null };
    return { name: 'Неизвестный пользователь', meta: null };
  }

  /**
   * Преобразует ReferralPerson в InviteeItem для отображения в списке.
   * @param p - Данные приглашённого.
   * @param index - Порядковый номер для цвета аватара.
   * @returns InviteeItem.
   */
  private _mapInvitee(p: ReferralPerson, index: number): InviteeItem {
    const displayName = p.nickname ?? (p.username !== null ? `@${p.username}` : (p.uin !== null ? `UIN ${p.uin}` : '—'));
    const initial = (p.nickname ?? p.username ?? p.uin ?? '?').charAt(0).toUpperCase();
    return {
      id: p.account_id,
      initials: initial,
      avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length] ?? '#7C6BFF',
      name: displayName,
      uin: p.uin ?? '—',
      invitedAt: new Date(p.joined_at).toLocaleDateString('ru-RU'),
    };
  }
}
