import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ChatApiService } from '../../../../../core/services/chat/chat-api.service';
import type { ApiOrphanPeer } from '../../../../../core/services/chat/chat-api.service';
import { avatarColorForId } from '../../../search/services/search-api.service';

/** Осиротевший собеседник для отображения. */
interface OrphanPeerItem {
  /** ID аккаунта. */
  readonly accountId: string;
  /** Отображаемое имя: nickname > @username > UIN > Аккаунт. */
  readonly displayName: string;
  /** UIN или null. */
  readonly uin: string | null;
  /** Инициалы для аватара. */
  readonly initials: string;
  /** Цвет аватара. */
  readonly avatarColor: string;
  /** Форматированная дата последнего чата. */
  readonly lastChatAt: string;
}

/**
 * Форматирует ISO-дату в относительную строку для отображения.
 * @param isoDate - ISO-8601 строка даты.
 * @returns Относительная метка времени на русском.
 */
function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = Date.now();
  const diff = now - date.getTime();
  const dayMs = 86_400_000;

  if (diff < dayMs) return 'сегодня';
  if (diff < 2 * dayMs) return 'вчера';
  const days = Math.floor(diff / dayMs);
  if (days < 7) return `${days.toString()} дн. назад`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks.toString()} нед. назад`;
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString();
  return `${d}.${m}.${y}`;
}

/**
 * Маппинг ApiOrphanPeer → OrphanPeerItem.
 * @param peer - Ответ API.
 * @returns Элемент для отображения.
 */
function mapPeer(peer: ApiOrphanPeer): OrphanPeerItem {
  let displayName: string;
  let initials: string;

  if (peer.nickname !== null) {
    displayName = peer.nickname;
    const words = peer.nickname.trim().split(/\s+/);
    initials = (words[0]?.[0]?.toUpperCase() ?? '?') + (words[1]?.[0]?.toUpperCase() ?? '');
  } else if (peer.username !== null) {
    displayName = `@${peer.username}`;
    initials = peer.username[0]?.toUpperCase() ?? '?';
  } else if (peer.uin !== null) {
    displayName = `UIN ${peer.uin}`;
    initials = peer.uin[0] ?? '?';
  } else {
    displayName = 'Аккаунт';
    initials = '?';
  }

  return {
    accountId: peer.account_id,
    displayName,
    uin: peer.uin,
    initials,
    avatarColor: avatarColorForId(peer.account_id),
    lastChatAt: formatRelativeDate(peer.last_chat_at),
  };
}

/** Экран нового устройства — список осиротевших собеседников из API. */
@Component({
  imports: [],
  selector: 'application-new-device',
  templateUrl: './new-device.component.html',
  styleUrl: './new-device.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewDeviceApplicationComponent implements OnInit {
  /** Список осиротевших собеседников. */
  public readonly peers: WritableSignal<readonly OrphanPeerItem[]> = signal([]);

  /** Идёт загрузка. */
  public readonly loading: WritableSignal<boolean> = signal(true);

  /** Роутер для навигации. */
  private readonly _router: Router = inject(Router);

  /** API чатов. */
  private readonly _chatApi: ChatApiService = inject(ChatApiService);

  /** @inheritdoc */
  public ngOnInit(): void {
    void this._load();
  }

  /**
   * Перейти к профилю пользователя.
   * @param accountId - ID аккаунта собеседника.
   */
  public openProfile(accountId: string): void {
    void this._router.navigate(['/application/main/user', accountId]);
  }

  /** Закрыть экран и перейти к чатам. */
  public dismiss(): void {
    void this._router.navigate(['/application/main/chats']);
  }

  /** Загружает список осиротевших собеседников из API. */
  private async _load(): Promise<void> {
    try {
      const result = await firstValueFrom(this._chatApi.readOrphanPeers());
      this.peers.set(result.map(mapPeer));
    } finally {
      this.loading.set(false);
    }
  }
}
