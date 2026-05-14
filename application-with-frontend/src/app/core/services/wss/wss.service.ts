import { Injectable, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';
import { API_BASE_URL } from '../../api/api-config';
import { TokenStorageService } from '../storage/token-storage.service';
import { SessionKickedService } from '../../../features/application/main/services/session-kicked.service';
import { UinModalService } from '../../../features/application/uin/services/uin-modal.service';

/** Возможные состояния WSS-соединения. */
export type WssConnectionState = 'disconnected' | 'connecting' | 'connected';

/** Входящее WSS-сообщение в формате { event, data }. */
interface WssMessage {
  /** Имя события. */
  readonly event: string;
  /** Данные события. */
  readonly data: Record<string, unknown>;
}

/** Данные события message_new — входящее сообщение. */
export interface WssMessageNewData {
  /** ID сообщения. */
  readonly messageId: string;
  /** ID чата. */
  readonly chatId: string;
  /** ID сессии отправителя. */
  readonly senderSessionId: string;
  /** Зашифрованный blob (base64). В phase 1 — просто UTF-8 контент. */
  readonly encryptedBlob: string;
}

/** Данные событий message_delivered / message_read — обновление статуса. */
export interface WssMessageStatusData {
  /** ID сообщения. */
  readonly messageId: string;
  /** ID чата. */
  readonly chatId: string;
}

/** Данные события message_sent — подтверждение отправки. */
export interface WssMessageSentData {
  /** Реальный ID сообщения, присвоенный сервером. */
  readonly messageId: string;
  /** ID чата. */
  readonly chatId: string;
}

/** Данные события chat_deleted — чат удалён собеседником. */
export interface WssChatDeletedData {
  /** ID удалённого чата. */
  readonly chatId: string;
}

/** Данные события session_created — новая сессия аккаунта. */
export interface WssSessionCreatedData {
  /** ID новой сессии. */
  readonly sessionId: string;
  /** Системное имя устройства. */
  readonly systemName: string;
  /** Платформа: ios | android | windows | macos | linux. */
  readonly platform: string;
}

const PING_INTERVAL_MS = 30_000;
const TOKEN_REFRESH_AHEAD_MS = 3_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Управляет WebSocket-соединением: подключение, heartbeat,
 * ротация токенов без реконнекта, dispatch серверных событий.
 * Singleton: подключение одно на всё приложение.
 */
@Injectable({ providedIn: 'root' })
export class WssService {
  /** Текущее состояние соединения. */
  public readonly connectionState: WritableSignal<WssConnectionState> = signal('disconnected');

  /**
   * Эмитирует ISO-строку `at` при получении события password_reset_via_recovery.
   * MainApplicationComponent подписывается и показывает баннер.
   */
  public readonly passwordResetAt$: Subject<string> = new Subject<string>();

  /**
   * Эмитирует ISO-строку `at` при получении события password_changed (смена пароля с другого устройства).
   * MainApplicationComponent подписывается и показывает баннер безопасности.
   */
  public readonly passwordChangedAt$: Subject<string> = new Subject<string>();

  /**
   * Эмитирует данные новой сессии при получении события session_created.
   * MainApplicationComponent подписывается и показывает баннер с кнопками «Кикнуть» / «Закрыть».
   */
  public readonly sessionCreated$: Subject<WssSessionCreatedData> = new Subject<WssSessionCreatedData>();

  /**
   * Эмитирует входящее сообщение (message_new).
   * ChatEventsService подписывается для сохранения в SQLite и отправки message_delivered.
   * ChatDetailComponent подписывается для обновления UI.
   */
  public readonly messageNew$: Subject<WssMessageNewData> = new Subject<WssMessageNewData>();

  /**
   * Эмитирует событие message_delivered — наше исходящее сообщение доставлено получателю.
   * ChatEventsService обновляет SQLite; ChatDetailComponent обновляет UI.
   */
  public readonly messageDelivered$: Subject<WssMessageStatusData> = new Subject<WssMessageStatusData>();

  /**
   * Эмитирует событие message_read — наше исходящее сообщение прочитано получателем.
   * ChatEventsService обновляет SQLite; ChatDetailComponent обновляет UI.
   */
  public readonly messageRead$: Subject<WssMessageStatusData> = new Subject<WssMessageStatusData>();

  /**
   * Эмитирует подтверждение отправки сообщения (message_sent).
   * ChatDetailComponent подписывается чтобы заменить optimistic-запись реальным ID.
   */
  public readonly messageSent$: Subject<WssMessageSentData> = new Subject<WssMessageSentData>();

  /**
   * Эмитирует chatId при получении события chat_deleted от собеседника.
   * ChatEventsService обновляет SQLite; ChatDetailComponent и ChatsComponent обновляют UI.
   */
  public readonly chatDeleted$: Subject<WssChatDeletedData> = new Subject<WssChatDeletedData>();

  /** Base URL бэкенда (из InjectionToken). */
  private readonly _apiBaseUrl: string = inject(API_BASE_URL);

  /** Хранилище access/refresh токенов. */
  private readonly _tokenStorage: TokenStorageService = inject(TokenStorageService);

  /** Сервис модалки кика сессии. */
  private readonly _sessionKicked: SessionKickedService = inject(SessionKickedService);

  /** Сервис UIN-модалок. */
  private readonly _uinModal: UinModalService = inject(UinModalService);

  /** Текущий WebSocket или null. */
  private _socket: WebSocket | null = null;

  /** ID интервала heartbeat или null. */
  private _pingInterval: ReturnType<typeof setInterval> | null = null;

  /** ID таймера ротации токена или null. */
  private _tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  /** ID таймера авто-реконнекта или null. */
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Количество последовательных попыток реконнекта (для exponential backoff). */
  private _reconnectAttempts: number = 0;

  /** true — соединение закрыто намеренно (logout / кик), реконнект не нужен. */
  private _intentionalDisconnect: boolean = false;

  /**
   * Подключается к WSS с текущим access-токеном.
   * Если соединение уже активно — ничего не делает.
   */
  public connect(): void {
    if (this.connectionState() !== 'disconnected') return;
    const token = this._tokenStorage.accessToken;
    if (token === null) return;
    this._intentionalDisconnect = false;
    this._reconnectAttempts = 0;
    this._openSocket(token);
  }

  /**
   * Отправляет WSS-сообщение если соединение открыто.
   * @param event - Имя события.
   * @param data - Данные события.
   * @returns true если сообщение отправлено, false если сокет не открыт.
   */
  public send(event: string, data: Record<string, unknown>): boolean {
    if (this._socket?.readyState !== WebSocket.OPEN) return false;
    this._socket.send(JSON.stringify({ event, data }));
    return true;
  }

  /** Закрывает соединение без авто-реконнекта (вызывается при logout). */
  public disconnect(): void {
    this._intentionalDisconnect = true;
    this._cleanup();
  }

  /**
   * Открывает новый WebSocket с заданным токеном.
   * @param token - JWT access-токен.
   */
  private _openSocket(token: string): void {
    this.connectionState.set('connecting');
    const socket = new WebSocket(this._buildWsUrl(token));
    this._socket = socket;

    socket.onopen = (): void => {
      this.connectionState.set('connected');
      this._reconnectAttempts = 0;
      this._startPing();
      this._scheduleTokenRefresh(token);
    };

    socket.onmessage = (event: MessageEvent<unknown>): void => {
      this._handleMessage(event);
    };

    socket.onclose = (event: CloseEvent): void => {
      this._onClose(event);
    };
  }

  /**
   * Разбирает и диспатчит входящее WSS-сообщение.
   * @param raw - Нативное MessageEvent.
   */
  private _handleMessage(raw: MessageEvent<unknown>): void {
    if (typeof raw.data !== 'string') return;
    let msg: WssMessage;
    try {
       
      msg = JSON.parse(raw.data) as WssMessage;
      if (typeof msg.event !== 'string') return;
    } catch {
      return;
    }

    switch (msg.event) {
      case 'tokens_updated':
        this._onTokensUpdated(msg.data);
        break;
      case 'session_kicked':
        this._onSessionKicked();
        break;
      case 'uin_assigned':
        this._onUinAssigned(msg.data);
        break;
      case 'password_reset_via_recovery':
        this._onPasswordReset(msg.data);
        break;
      case 'password_changed':
        this._onPasswordChanged(msg.data);
        break;
      case 'session_created':
        this._onSessionCreated(msg.data);
        break;
      case 'message_new':
        this._onMessageNew(msg.data);
        break;
      case 'message_delivered':
        this._onMessageStatusUpdate(msg.data, this.messageDelivered$);
        break;
      case 'message_read':
        this._onMessageStatusUpdate(msg.data, this.messageRead$);
        break;
      case 'message_sent':
        this._onMessageSent(msg.data);
        break;
      case 'chat_deleted':
        this._onChatDeleted(msg.data);
        break;
      case 'error':
        this._onWssError(msg.data);
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }

  /**
   * Сохраняет новую пару токенов и перезапускает таймер ротации.
   * @param data - Данные события tokens_updated.
   */
  private _onTokensUpdated(data: Record<string, unknown>): void {
    const accessToken = data['access_token'];
    const refreshToken = data['refresh_token'];
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') return;
    this._tokenStorage.store(accessToken, refreshToken);
    this._cancelTokenRefresh();
    this._scheduleTokenRefresh(accessToken);
  }

  /** Обрабатывает session_kicked: закрывает соединение, очищает токены, показывает модалку. */
  private _onSessionKicked(): void {
    this._intentionalDisconnect = true;
    this._cleanup();
    this._tokenStorage.clear();
    this._sessionKicked.showKickedModal();
  }

  /**
   * Передаёт присвоенный UIN в UinModalService.
   * @param data - Данные события uin_assigned.
   */
  private _onUinAssigned(data: Record<string, unknown>): void {
    const uin = data['uin'];
    if (typeof uin !== 'string') return;
    this._uinModal.closePendingAndShowAssigned(uin);
  }

  /**
   * Эмитирует в passwordResetAt$ для отображения баннера в MainComponent.
   * @param data - Данные события password_reset_via_recovery.
   */
  private _onPasswordReset(data: Record<string, unknown>): void {
    const at = data['at'];
    if (typeof at !== 'string') return;
    this.passwordResetAt$.next(at);
  }

  /**
   * Эмитирует в passwordChangedAt$ при смене пароля с другого устройства.
   * @param data - Данные события password_changed.
   */
  private _onPasswordChanged(data: Record<string, unknown>): void {
    const at = data['at'];
    if (typeof at !== 'string') return;
    this.passwordChangedAt$.next(at);
  }

  /**
   * Эмитирует в sessionCreated$ при входе с нового устройства.
   * @param data - Данные события session_created.
   */
  private _onSessionCreated(data: Record<string, unknown>): void {
    const sessionId = data['session_id'];
    const systemName = data['system_name'];
    const platform = data['platform'];
    if (typeof sessionId !== 'string' || typeof systemName !== 'string' || typeof platform !== 'string') return;
    this.sessionCreated$.next({ sessionId, systemName, platform });
  }

  /**
   * Эмитирует messageNew$ при получении входящего сообщения.
   * @param data - Данные события message_new.
   */
  private _onMessageNew(data: Record<string, unknown>): void {
    const messageId = data['message_id'];
    const chatId = data['chat_id'];
    const senderSessionId = data['sender_session_id'];
    const encryptedBlob = data['encrypted_blob'];
    if (
      typeof messageId !== 'string' ||
      typeof chatId !== 'string' ||
      typeof senderSessionId !== 'string' ||
      typeof encryptedBlob !== 'string'
    ) return;
    this.messageNew$.next({ messageId, chatId, senderSessionId, encryptedBlob });
  }

  /**
   * Разбирает message_delivered / message_read и эмитирует в переданный Subject.
   * @param data - Данные события.
   * @param target - Subject для эмита.
   */
  private _onMessageStatusUpdate(data: Record<string, unknown>, target: Subject<WssMessageStatusData>): void {
    const messageId = data['message_id'];
    const chatId = data['chat_id'];
    if (typeof messageId !== 'string' || typeof chatId !== 'string') return;
    target.next({ messageId, chatId });
  }

  /**
   * Эмитирует messageSent$ при получении подтверждения отправки.
   * @param data - Данные события message_sent.
   */
  private _onMessageSent(data: Record<string, unknown>): void {
    const messageId = data['message_id'];
    const chatId = data['chat_id'];
    if (typeof messageId !== 'string' || typeof chatId !== 'string') return;
    this.messageSent$.next({ messageId, chatId });
  }

  /**
   * Эмитирует chatDeleted$ при получении события chat_deleted от сервера.
   * @param data - Данные события chat_deleted.
   */
  private _onChatDeleted(data: Record<string, unknown>): void {
    const chatId = data['chat_id'];
    if (typeof chatId !== 'string') return;
    this.chatDeleted$.next({ chatId });
  }

  /**
   * Обрабатывает WSS-ошибку. При refresh_reused кикает как session_kicked.
   * @param data - Данные события error.
   */
  private _onWssError(data: Record<string, unknown>): void {
    if (data['code'] === 'refresh_reused') {
      this._intentionalDisconnect = true;
      this._cleanup();
      this._tokenStorage.clear();
      this._sessionKicked.showKickedModal();
    }
  }

  /**
   * Вызывается при закрытии сокета. Запускает реконнект если закрытие не намеренное.
   * @param event - CloseEvent с кодом закрытия.
   */
  private _onClose(event: CloseEvent): void {
    this._stopPing();
    this._cancelTokenRefresh();
    this._socket = null;
    this.connectionState.set('disconnected');
    if (!this._intentionalDisconnect && event.code !== 4001) {
      this._scheduleReconnect();
    }
  }

  /** Запускает периодическую отправку ping. */
  private _startPing(): void {
    this._pingInterval = setInterval((): void => {
      if (this._socket?.readyState === WebSocket.OPEN) {
        this._socket.send(JSON.stringify({ event: 'ping', data: {} }));
      }
    }, PING_INTERVAL_MS);
  }

  /** Останавливает периодическую отправку ping. */
  private _stopPing(): void {
    if (this._pingInterval !== null) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }

  /**
   * Планирует отправку token_refresh за TOKEN_REFRESH_AHEAD_MS до истечения access-токена.
   * @param accessToken - Текущий JWT access-токен.
   */
  private _scheduleTokenRefresh(accessToken: string): void {
    const exp = this._decodeJwtExp(accessToken);
    if (exp === null) return;
    const delayMs = exp * 1000 - Date.now() - TOKEN_REFRESH_AHEAD_MS;
    if (delayMs <= 0) {
      this._sendTokenRefresh();
      return;
    }
    this._tokenRefreshTimer = setTimeout((): void => {
      this._sendTokenRefresh();
    }, delayMs);
  }

  /** Отменяет запланированную ротацию токена. */
  private _cancelTokenRefresh(): void {
    if (this._tokenRefreshTimer !== null) {
      clearTimeout(this._tokenRefreshTimer);
      this._tokenRefreshTimer = null;
    }
  }

  /** Отправляет сообщение token_refresh с текущим refresh-токеном. */
  private _sendTokenRefresh(): void {
    const refreshToken = this._tokenStorage.refreshToken;
    if (refreshToken === null || this._socket?.readyState !== WebSocket.OPEN) return;
    this._socket.send(JSON.stringify({
      event: 'token_refresh',
      /* eslint-disable-next-line @typescript-eslint/naming-convention -- API snake_case */
      data: { refresh_token: refreshToken },
    }));
  }

  /** Планирует реконнект с exponential backoff (1s → 2s → 4s … max 30s). */
  private _scheduleReconnect(): void {
    const delay = Math.min(1000 * (2 ** this._reconnectAttempts), MAX_RECONNECT_DELAY_MS);
    this._reconnectAttempts += 1;
    this._reconnectTimer = setTimeout((): void => {
      if (this.connectionState() !== 'disconnected') return;
      const token = this._tokenStorage.accessToken;
      if (token !== null) {
        this._openSocket(token);
      }
    }, delay);
  }

  /** Останавливает heartbeat, таймеры и закрывает сокет без вызова _onClose. */
  private _cleanup(): void {
    this._stopPing();
    this._cancelTokenRefresh();
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._socket !== null) {
      this._socket.onclose = null;
      this._socket.close();
      this._socket = null;
    }
    this.connectionState.set('disconnected');
  }

  /**
   * Строит WSS URL из API_BASE_URL: http→ws, https→wss, убирает /api/v1.
   * @param token - JWT access-токен для ?token= query-параметра.
   * @returns Полный WSS URL.
   */
  private _buildWsUrl(token: string): string {
    const wsBase = this._apiBaseUrl
      .replace(/^https:/u, 'wss:')
      .replace(/^http:/u, 'ws:')
      .replace(/\/api\/v1$/u, '');
    return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
  }

  /**
   * Декодирует поле `exp` из JWT payload (base64url) без внешних зависимостей.
   * @param token - JWT access-токен.
   * @returns Unix timestamp истечения (секунды) или null если не удалось.
   */
  private _decodeJwtExp(token: string): number | null {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[1] === undefined) return null;
    try {
      const padded = parts[1].replace(/-/gu, '+').replace(/_/gu, '/');
      const decoded = atob(padded);
       
      const payload = JSON.parse(decoded) as Record<string, unknown>;
      const exp = payload['exp'];
      return typeof exp === 'number' ? exp : null;
    } catch {
      return null;
    }
  }
}
