import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatsStateService } from '../../services/chats-state.service';
import { LocalChatRepository } from '../../../../../core/services/local-db/local-chat.repository';
import type { LocalChatWithPeer, LocalMessage, LocalMessageStatus } from '../../../../../core/services/local-db/local-db.types';
import { TokenStorageService } from '../../../../../core/services/storage/token-storage.service';
import { WssService } from '../../../../../core/services/wss/wss.service';
import type { WssMessageSentData } from '../../../../../core/services/wss/wss.service';
import { avatarColorForId } from '../../../search/services/search-api.service';

/** Данные чата для отображения. */
interface ChatDetailView {
  /** ID чата. */
  readonly id: string;
  /** Название чата (задаётся при создании). */
  readonly chatName: string;
  /** Отображаемое имя собеседника. */
  readonly peerDisplay: string;
  /** Метка устройства собеседника. */
  readonly deviceLabel: string;
  /** Инициалы для аватара. */
  readonly initials: string;
  /** Цвет аватара. */
  readonly avatarColor: string;
  /** true — ключ ещё не обменян. */
  readonly pendingKey: boolean;
  /** true — чат удалён, ввод заблокирован. */
  readonly isDead: boolean;
  /** ID аккаунта собеседника или null. */
  readonly peerAccountId: string | null;
}

/** Сообщение для отображения. */
interface MessageItem {
  /** ID сообщения (реальный или временный). */
  readonly id: string;
  /** Текст сообщения. */
  readonly text: string;
  /** Форматированное время отправки. */
  readonly time: string;
  /** true — исходящее. */
  readonly isOwn: boolean;
  /** Статус доставки. */
  readonly status: LocalMessageStatus;
}

/** Запись об оптимистично отправленном сообщении. */
interface PendingSend {
  /** Временный ID в сигнале. */
  readonly tempId: string;
  /** Текст сообщения. */
  readonly content: string;
  /** Unix-время создания (мс). */
  readonly createdAt: number;
}

/**
 * Декодирует sessionId из JWT payload без внешних зависимостей.
 * @param token - JWT access-токен.
 * @returns sessionId или null при ошибке.
 */
function decodeSessionId(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[1] === undefined) return null;
  try {
    const padded = parts[1].replace(/-/gu, '+').replace(/_/gu, '/');
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const sessionId = payload['sessionId'];
    return typeof sessionId === 'string' ? sessionId : null;
  } catch {
    return null;
  }
}

/**
 * Кодирует UTF-8 строку в base64 (для encrypted_blob в phase 1).
 * @param text - Исходная строка.
 * @returns base64-строка.
 */
function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte: number): void => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * Форматирует Unix-время (мс) в HH:MM.
 * @param ts - Timestamp в миллисекундах.
 * @returns Строка времени.
 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Строит ChatDetailView из LocalChatWithPeer.
 * @param chat - Чат с данными собеседника.
 * @returns Данные для отображения.
 */
function buildChatView(chat: LocalChatWithPeer): ChatDetailView {
  const peer = chat.peer;
  let peerDisplay = '';
  let initials = '?';
  let deviceLabel = '';
  let avatarColor = '';
  let peerAccountId: string | null = null;

  if (peer !== null) {
    peerAccountId = peer.accountId;
    deviceLabel = peer.deviceNickname ?? peer.systemName;
    avatarColor = avatarColorForId(peer.accountId);

    if (peer.nickname !== null) {
      const words = peer.nickname.trim().split(/\s+/);
      peerDisplay = peer.nickname;
      initials = (words[0]?.[0]?.toUpperCase() ?? '?') + (words[1]?.[0]?.toUpperCase() ?? '');
    } else if (peer.username !== null) {
      peerDisplay = `@${peer.username}`;
      initials = peer.username[0]?.toUpperCase() ?? '?';
    } else if (peer.uin !== null) {
      peerDisplay = `UIN ${peer.uin}`;
      initials = peer.uin[0] ?? '?';
    } else {
      peerDisplay = peer.systemName;
      initials = peer.systemName[0]?.toUpperCase() ?? '?';
    }
  }

  return {
    id: chat.id,
    chatName: chat.name,
    peerDisplay,
    deviceLabel,
    initials,
    avatarColor,
    pendingKey: chat.status === 'pending_key',
    isDead: chat.status === 'is_dead',
    peerAccountId,
  };
}

/**
 * Маппинг LocalMessage → MessageItem.
 * @param msg - Сообщение из SQLite.
 * @returns Элемент для отображения.
 */
function mapMessage(msg: LocalMessage): MessageItem {
  return {
    id: msg.id,
    text: msg.content,
    time: formatTime(msg.createdAt),
    isOwn: msg.isOutgoing,
    status: msg.status,
  };
}

/** Экран чата — загрузка из SQLite, отправка через WSS. */
@Component({
  imports: [FormsModule],
  selector: 'application-chat-detail',
  templateUrl: './chat-detail.component.html',
  styleUrl: './chat-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatDetailApplicationComponent implements OnInit {
  /** Данные чата для отображения. */
  public readonly chat: WritableSignal<ChatDetailView | null> = signal(null);

  /** Список сообщений (confirmed + optimistic). */
  public readonly messages: WritableSignal<readonly MessageItem[]> = signal([]);

  /** Текст нового сообщения. */
  public messageText: string = '';

  /** Маршрут — для чтения chatId. */
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);

  /** Роутер для навигации. */
  private readonly _router: Router = inject(Router);

  /** Сервис состояния чатов. */
  private readonly _chatsState: ChatsStateService = inject(ChatsStateService);

  /** Репозиторий локальной БД. */
  private readonly _chatRepo: LocalChatRepository = inject(LocalChatRepository);

  /** Хранилище токенов. */
  private readonly _tokenStorage: TokenStorageService = inject(TokenStorageService);

  /** WSS-сервис. */
  private readonly _wss: WssService = inject(WssService);

  /** DestroyRef для очистки подписок. */
  private readonly _destroyRef: DestroyRef = inject(DestroyRef);

  /** ID текущего чата. */
  private _chatId: string = '';

  /** ID текущей сессии (из JWT). */
  private _mySessionId: string = '';

  /** Очередь оптимистично отправленных сообщений (FIFO). */
  private readonly _pendingSends: PendingSend[] = [];

  /** @inheritdoc */
  public ngOnInit(): void {
    const chatId = this._route.snapshot.paramMap.get('chatId');
    if (chatId === null) {
      void this._router.navigate(['/application/main/chats']);
      return;
    }
    this._chatId = chatId;

    const token = this._tokenStorage.accessToken;
    this._mySessionId = (token !== null ? decodeSessionId(token) : null) ?? '';

    this._chatsState.setActiveChat(chatId);
    this._subscribeToMessageSent();
    void this._load(chatId);
  }

  /** Открыть профиль собеседника. */
  public openContactProfile(): void {
    const accountId = this.chat()?.peerAccountId;
    if (accountId !== null && accountId !== undefined) {
      void this._router.navigate(['/application/main/user', accountId]);
    }
  }

  /** Назад к списку чатов. */
  public goBack(): void {
    this._chatsState.clearActiveChat();
    void this._router.navigate(['/application/main/chats']);
  }

  /** Отправить сообщение — оптимистичный UI + WSS. */
  public sendMessage(): void {
    const text = this.messageText.trim();
    const currentChat = this.chat();
    if (text === '' || currentChat === null || currentChat.isDead) return;

    const now = Date.now();
    const tempId = `temp_${now.toString()}`;

    const optimistic: MessageItem = {
      id: tempId,
      text,
      time: formatTime(now),
      isOwn: true,
      status: 'sending',
    };

    this.messages.update((msgs: readonly MessageItem[]): readonly MessageItem[] => [...msgs, optimistic]);
    this.messageText = '';

    const pending: PendingSend = { tempId, content: text, createdAt: now };
    this._pendingSends.push(pending);

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    const sent = this._wss.send('send_message', {
      chat_id: this._chatId,
      encrypted_blob: textToBase64(text),
    });
    /* eslint-enable @typescript-eslint/naming-convention */

    if (!sent) {
      this._markFirstPendingFailed();
    }
  }

  /**
   * Повторная отправка упавшего сообщения.
   * @param messageId - ID сообщения.
   */
  public retryMessage(messageId: string): void {
    const msg = this.messages().find((m: MessageItem): boolean => m.id === messageId);
    if (msg === undefined) return;

    const now = Date.now();
    const tempId = `temp_${now.toString()}`;

    this.messages.update((msgs: readonly MessageItem[]): readonly MessageItem[] =>
      msgs.map((m: MessageItem): MessageItem =>
        m.id === messageId ? { ...m, id: tempId, status: 'sending' } : m,
      ),
    );

    const pending: PendingSend = { tempId, content: msg.text, createdAt: now };
    this._pendingSends.push(pending);

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    const sent = this._wss.send('send_message', {
      chat_id: this._chatId,
      encrypted_blob: textToBase64(msg.text),
    });
    /* eslint-enable @typescript-eslint/naming-convention */

    if (!sent) {
      this._markFirstPendingFailed();
    }
  }

  /**
   * Загружает чат и сообщения из SQLite.
   * @param chatId - ID чата.
   */
  private async _load(chatId: string): Promise<void> {
    const chatData = await this._chatRepo.getChat(chatId);
    if (chatData === null) {
      void this._router.navigate(['/application/main/chats']);
      return;
    }
    this.chat.set(buildChatView(chatData));

    const stored = await this._chatRepo.getMessages(chatId);
    this.messages.set(stored.map(mapMessage));
  }

  /** Подписывается на message_sent от WssService. */
  private _subscribeToMessageSent(): void {
    const sub = this._wss.messageSent$.subscribe((data: WssMessageSentData): void => {
      if (data.chatId !== this._chatId) return;
      void this._onMessageSent(data.messageId);
    });
    this._destroyRef.onDestroy((): void => { sub.unsubscribe(); });
  }

  /**
   * Обрабатывает подтверждение отправки: заменяет temp-запись реальной и сохраняет в SQLite.
   * @param messageId - Реальный ID сообщения от сервера.
   */
  private async _onMessageSent(messageId: string): Promise<void> {
    const pending = this._pendingSends.shift();
    if (pending === undefined) return;

    this.messages.update((msgs: readonly MessageItem[]): readonly MessageItem[] =>
      msgs.map((m: MessageItem): MessageItem =>
        m.id === pending.tempId ? { ...m, id: messageId, status: 'sent' } : m,
      ),
    );

    const localMsg: LocalMessage = {
      id: messageId,
      chatId: this._chatId,
      senderSessionId: this._mySessionId,
      content: pending.content,
      status: 'sent',
      isOutgoing: true,
      createdAt: pending.createdAt,
    };
    await this._chatRepo.saveMessage(localMsg);
    await this._chatRepo.updateChatStatus(this._chatId, 'active');
  }

  /** Помечает первое ожидающее сообщение как failed. */
  private _markFirstPendingFailed(): void {
    const pending = this._pendingSends.shift();
    if (pending === undefined) return;
    this.messages.update((msgs: readonly MessageItem[]): readonly MessageItem[] =>
      msgs.map((m: MessageItem): MessageItem =>
        m.id === pending.tempId ? { ...m, status: 'failed' } : m,
      ),
    );
  }
}
