import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatsStateService } from '../../services/chats-state.service';
import { LocalChatRepository } from '../../../../../core/services/local-db/local-chat.repository';
import type { LocalChatWithPeer, LocalMessage, LocalMessageStatus } from '../../../../../core/services/local-db/local-db.types';
import { TokenStorageService } from '../../../../../core/services/storage/token-storage.service';
import { WssService } from '../../../../../core/services/wss/wss.service';
import type { WssChatDeletedData, WssMessageSentData, WssMessageNewData, WssMessageStatusData } from '../../../../../core/services/wss/wss.service';
import { ChatEventsService } from '../../../../../core/services/chat/chat-events.service';
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

/** Запись об оптимистично отправленном сообщении в активном WSS-потоке. */
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

/** Экран чата — загрузка из SQLite, отправка через ChatEventsService (E2E AES-256-GCM). */
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

  /** WSS-сервис (статусы и события доставки). */
  private readonly _wss: WssService = inject(WssService);

  /** Сервис событий чата (отправка, расшифровка, обмен ключами). */
  private readonly _chatEvents: ChatEventsService = inject(ChatEventsService);

  /** DestroyRef для очистки подписок. */
  private readonly _destroyRef: DestroyRef = inject(DestroyRef);

  /** ID текущего чата. */
  private _chatId: string = '';

  /** ID текущей сессии (из JWT). */
  private _mySessionId: string = '';

  /**
   * Очередь оптимистично отправленных сообщений в WSS (FIFO для message_sent).
   * Только для сообщений, уже отправленных по WSS.
   */
  private readonly _pendingSends: PendingSend[] = [];

  /**
   * Сообщения, набранные в период pending_key.
   * Отправляются когда chatActivated$ сигнализирует о завершении обмена ключами.
   */
  private readonly _pendingKeySends: PendingSend[] = [];

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
    this._subscribeToMessageNew();
    this._subscribeToStatusUpdates();
    this._subscribeToChatDeleted();
    this._subscribeToChatActivated();
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

  /** Отправить сообщение — оптимистичный UI + шифрование через ChatEventsService. */
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

    if (currentChat.pendingKey) {
      this._pendingKeySends.push({ tempId, content: text, createdAt: now });
      return;
    }

    this._pendingSends.push({ tempId, content: text, createdAt: now });
    void this._doSend(tempId, text);
  }

  /**
   * Повторная отправка упавшего сообщения.
   * @param messageId - ID сообщения со статусом failed.
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

    this._pendingSends.push({ tempId, content: msg.text, createdAt: now });
    void this._doSend(tempId, msg.text);
  }

  /**
   * Загружает чат и сообщения из SQLite.
   * Входящие 'delivered' сообщения помечаются 'read' и сигнализируются серверу.
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

    const unread = stored.filter(
      (m: LocalMessage): boolean => !m.isOutgoing && m.status === 'delivered',
    );

    for (const msg of unread) {
      await this._chatRepo.updateMessageStatus(msg.id, 'read');
      /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
      this._wss.send('message_read', { message_id: msg.id, chat_id: chatId });
      /* eslint-enable @typescript-eslint/naming-convention */
    }

    const withRead = stored.map((m: LocalMessage): LocalMessage =>
      !m.isOutgoing && m.status === 'delivered' ? { ...m, status: 'read' as const } : m,
    );

    this.messages.set(withRead.map(mapMessage));
  }

  /**
   * Шифрует и отправляет сообщение через ChatEventsService.
   * При ошибке (WSS отключён) помечает сообщение как failed.
   * @param tempId - Временный ID оптимистичного сообщения.
   * @param content - Открытый текст.
   */
  private async _doSend(tempId: string, content: string): Promise<void> {
    const sent = await this._chatEvents.sendMessage(this._chatId, content);
    if (!sent) {
      this._failSend(tempId);
    }
  }

  /**
   * Помечает оптимистичное сообщение как failed и убирает из очереди.
   * @param tempId - Временный ID сообщения.
   */
  private _failSend(tempId: string): void {
    const idx = this._pendingSends.findIndex((p: PendingSend): boolean => p.tempId === tempId);
    if (idx !== -1) this._pendingSends.splice(idx, 1);
    this.messages.update((msgs: readonly MessageItem[]): readonly MessageItem[] =>
      msgs.map((m: MessageItem): MessageItem =>
        m.id === tempId ? { ...m, status: 'failed' as const } : m,
      ),
    );
  }

  /** Подписывается на message_delivered и message_read для обновления статусов в UI. */
  private _subscribeToStatusUpdates(): void {
    const updateStatus = (data: WssMessageStatusData, status: 'delivered' | 'read'): void => {
      if (data.chatId !== this._chatId) return;
      this.messages.update((msgs: readonly MessageItem[]): readonly MessageItem[] =>
        msgs.map((m: MessageItem): MessageItem =>
          m.id === data.messageId ? { ...m, status } : m,
        ),
      );
    };

    const subD = this._wss.messageDelivered$.subscribe((d: WssMessageStatusData): void => { updateStatus(d, 'delivered'); });
    const subR = this._wss.messageRead$.subscribe((d: WssMessageStatusData): void => { updateStatus(d, 'read'); });
    this._destroyRef.onDestroy((): void => { subD.unsubscribe(); subR.unsubscribe(); });
  }

  /** Подписывается на message_new: расшифровывает blob через ChatEventsService и обновляет UI. */
  private _subscribeToMessageNew(): void {
    const sub = this._wss.messageNew$.subscribe((data: WssMessageNewData): void => {
      if (data.chatId !== this._chatId) return;
      void this._onIncomingMessage(data);
    });
    this._destroyRef.onDestroy((): void => { sub.unsubscribe(); });
  }

  /**
   * Расшифровывает и добавляет входящее сообщение в UI.
   * @param data - Данные события message_new.
   */
  private async _onIncomingMessage(data: WssMessageNewData): Promise<void> {
    const content = await this._chatEvents.decryptBlob(data.chatId, data.encryptedBlob);
    const incoming: MessageItem = {
      id: data.messageId,
      text: content,
      time: formatTime(Date.now()),
      isOwn: false,
      status: 'delivered',
    };
    this.messages.update((msgs: readonly MessageItem[]): readonly MessageItem[] => [...msgs, incoming]);
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

  /**
   * Подписывается на chatActivated$: когда обмен ключами завершён —
   * обновляет UI и отправляет сообщения из pending_key очереди.
   */
  private _subscribeToChatActivated(): void {
    const sub = this._chatEvents.chatActivated$.subscribe((chatId: string): void => {
      if (chatId !== this._chatId) return;
      this.chat.update((c: ChatDetailView | null): ChatDetailView | null =>
        c !== null ? { ...c, pendingKey: false } : null,
      );
      this._flushPendingKeySends();
    });
    this._destroyRef.onDestroy((): void => { sub.unsubscribe(); });
  }

  /**
   * Отправляет все сообщения, набранные в период pending_key.
   * Вызывается когда chatActivated$ эмитирует chatId текущего чата.
   */
  private _flushPendingKeySends(): void {
    const toSend = this._pendingKeySends.splice(0);
    for (const item of toSend) {
      this._pendingSends.push(item);
      void this._doSend(item.tempId, item.content);
    }
  }

  /** Подписывается на chat_deleted: если текущий чат удалён — переводит UI в режим is_dead. */
  private _subscribeToChatDeleted(): void {
    const sub = this._wss.chatDeleted$.subscribe((data: WssChatDeletedData): void => {
      if (data.chatId !== this._chatId) return;
      this.chat.update((c: ChatDetailView | null): ChatDetailView | null =>
        c !== null ? { ...c, isDead: true } : null,
      );
    });
    this._destroyRef.onDestroy((): void => { sub.unsubscribe(); });
  }
}
