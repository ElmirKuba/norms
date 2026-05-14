import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalChatRepository } from '../../../../../core/services/local-db/local-chat.repository';
import type { LocalChatWithPeer, LocalPeerDevice } from '../../../../../core/services/local-db/local-db.types';
import { avatarColorForId } from '../../../search/services/search-api.service';
import { WssService } from '../../../../../core/services/wss/wss.service';
import type { WssChatDeletedData } from '../../../../../core/services/wss/wss.service';

/** Результат buildPeerDisplay. */
interface PeerDisplayResult {
  /** Отображаемое имя. */
  readonly display: string;
  /** Инициалы. */
  readonly initials: string;
}

/** Элемент списка чатов для отображения. */
interface ChatListItem {
  /** ID чата. */
  readonly id: string;
  /** Название чата. */
  readonly chatName: string;
  /** Отображаемое имя собеседника: nickname > @username > UIN > systemName. */
  readonly peerDisplay: string;
  /** UIN собеседника или null. */
  readonly uin: string | null;
  /** Username собеседника или null. */
  readonly username: string | null;
  /** Метка устройства: deviceNickname ?? systemName. */
  readonly deviceLabel: string;
  /** Инициалы для аватара. */
  readonly initials: string;
  /** Цвет аватара. */
  readonly avatarColor: string;
  /** true — ключ ещё не обменян. */
  readonly pendingKey: boolean;
  /** Форматированное время последнего обновления. */
  readonly formattedTime: string;
}

/**
 * Строит отображаемое имя и инициалы из данных собеседника.
 * @param peer - Данные устройства собеседника.
 * @returns Отображаемое имя и инициалы.
 */
function buildPeerDisplay(peer: LocalPeerDevice): PeerDisplayResult {
  if (peer.nickname !== null) {
    const words = peer.nickname.trim().split(/\s+/);
    const first = words[0]?.[0]?.toUpperCase() ?? '?';
    const second = words[1]?.[0]?.toUpperCase() ?? '';
    return { display: peer.nickname, initials: first + second };
  }
  if (peer.username !== null) {
    return { display: `@${peer.username}`, initials: peer.username[0]?.toUpperCase() ?? '?' };
  }
  if (peer.uin !== null) {
    return { display: `UIN ${peer.uin}`, initials: peer.uin[0] ?? '?' };
  }
  return { display: peer.systemName, initials: peer.systemName[0]?.toUpperCase() ?? '?' };
}

/**
 * Форматирует Unix-время (мс) в читаемую строку для превью чата.
 * @param ts - Timestamp в миллисекундах.
 * @returns Форматированная строка (HH:MM / вчера / пн / DD.MM.YY).
 */
function formatChatTime(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;

  if (ts >= todayStart) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  if (ts >= yesterdayStart) return 'вчера';
  if (ts >= weekStart) {
    const days: readonly string[] = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    return days[date.getDay()] ?? '';
  }
  const d = date.getDate().toString().padStart(2, '0');
  const mo = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString().slice(-2);
  return `${d}.${mo}.${y}`;
}

/**
 * Маппинг LocalChatWithPeer → ChatListItem.
 * @param chat - Чат с данными собеседника.
 * @returns Элемент списка чатов.
 */
function mapToListItem(chat: LocalChatWithPeer): ChatListItem {
  const peer = chat.peer;
  let peerDisplay = '';
  let initials = '?';
  let uin: string | null = null;
  let username: string | null = null;
  let deviceLabel = '';
  let avatarColor = '';

  if (peer !== null) {
    const built = buildPeerDisplay(peer);
    peerDisplay = built.display;
    initials = built.initials;
    uin = peer.uin;
    username = peer.username;
    deviceLabel = peer.deviceNickname ?? peer.systemName;
    avatarColor = avatarColorForId(peer.accountId);
  }

  return {
    id: chat.id,
    chatName: chat.name,
    peerDisplay,
    uin,
    username,
    deviceLabel,
    initials,
    avatarColor,
    pendingKey: chat.status === 'pending_key',
    formattedTime: formatChatTime(chat.updatedAt),
  };
}

/** Экран списка чатов — загружает из локальной SQLite. */
@Component({
  imports: [RouterLink],
  selector: 'application-chats',
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatsApplicationComponent implements OnInit {
  /** Список чатов для отображения. */
  public readonly chats: WritableSignal<readonly ChatListItem[]> = signal([]);

  /** Идёт загрузка. */
  public readonly loading: WritableSignal<boolean> = signal(true);

  /** Репозиторий локальной БД. */
  private readonly _chatRepo: LocalChatRepository = inject(LocalChatRepository);

  /** WSS-сервис для live-обновлений. */
  private readonly _wss: WssService = inject(WssService);

  /** DestroyRef для очистки подписок. */
  private readonly _destroyRef: DestroyRef = inject(DestroyRef);

  /** @inheritdoc */
  public ngOnInit(): void {
    void this._load();
    this._subscribeToChatDeleted();
  }

  /** Загружает активные чаты из локальной SQLite (is_dead исключены). */
  private async _load(): Promise<void> {
    const raw = await this._chatRepo.getChats();
    this.chats.set(raw.filter((c: LocalChatWithPeer): boolean => c.status !== 'is_dead').map(mapToListItem));
    this.loading.set(false);
  }

  /** Подписывается на chat_deleted: удаляет чат из списка при получении события. */
  private _subscribeToChatDeleted(): void {
    const sub = this._wss.chatDeleted$.subscribe((data: WssChatDeletedData): void => {
      this.chats.update((list: readonly ChatListItem[]): readonly ChatListItem[] =>
        list.filter((c: ChatListItem): boolean => c.id !== data.chatId),
      );
    });
    this._destroyRef.onDestroy((): void => { sub.unsubscribe(); });
  }
}
