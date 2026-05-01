import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogModalComponent } from '../../../../../shared/modals/components/dialog-modal/dialog-modal.component';
import { MODAL_BOTTOM_SHEET_PARAMS } from '../../../../../shared/modals/constants/modal.constants';
import { ModalHeaderIcon } from '../../../../../shared/modals/types/modal.types';
import { MOCK_INVITE_CODES, MOCK_INVITED_USERS } from '../../types/invites.types';
import type { MockInviteCode, MockInvitedUser } from '../../types/invites.types';
import type { DialogModalData } from '../../../../../shared/modals/types/modal.types';

/** Подэкран настроек — Инвайты */
@Component({
  imports: [],
  selector: 'application-settings-invites',
  templateUrl: './invites.component.html',
  styleUrl: './invites.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsInvitesComponent {
  private readonly _router: Router = inject(Router);
  private readonly _dialog: MatDialog = inject(MatDialog);

  /** Остаток инвайтов (мок) */
  public readonly remaining = signal<number>(3 - MOCK_INVITE_CODES.length);

  /** Активные коды (мок) */
  public readonly codes = signal<MockInviteCode[]>(MOCK_INVITE_CODES);

  /** Приглашённые пользователи (мок) */
  public readonly invitedUsers: MockInvitedUser[] = MOCK_INVITED_USERS;

  /** Кто меня пригласил (мок) */
  public readonly invitedBy: string = 'Алексей К. (UIN 10042)';

  /** Скопирован ли код */
  public readonly copiedId = signal<string | null>(null);

  /** Назад к настройкам */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }

  /** Создать новый код (мок) */
  public createCode(): void {
    if (this.remaining() <= 0) return;

    const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    const formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;

    const newCode: MockInviteCode = {
      id: `mock_${Date.now()}`,
      code: formatted,
      expiresAt: '30 мая 2025',
    };

    this.codes.update((list) => [...list, newCode]);
    this.remaining.update((n) => n - 1);

    this._dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
      ...MODAL_BOTTOM_SHEET_PARAMS,
      data: {
        icon: ModalHeaderIcon.Done,
        title: 'Инвайт создан',
        text: `Код: <strong>${formatted}</strong>\n\nПередай его тому, кого хочешь пригласить. Код одноразовый и действует 30 дней.`,
        closeBtnText: 'Понятно',
      },
    });
  }

  /** Отозвать код (мок) */
  public revokeCode(id: string): void {
    this.codes.update((list) => list.filter((c) => c.id !== id));
    this.remaining.update((n) => n + 1);
  }

  /** Скопировать код в буфер */
  public copyCode(code: MockInviteCode): void {
    void navigator.clipboard.writeText(code.code).then(() => {
      this.copiedId.set(code.id);
      setTimeout(() => { this.copiedId.set(null); }, 1500);
    });
  }
}
