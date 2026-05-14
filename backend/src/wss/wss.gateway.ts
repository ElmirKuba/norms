import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Server, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import { WssConnectionStore } from './wss-connection.store';
import { SessionRepository } from '../domain/ports/session.repository.port';
import { ChatRepository } from '../domain/ports/chat.repository.port';
import { SendMessageUseCase } from '../chat/use-cases/send-message.use-case';
import { MessageDeliveredUseCase } from '../chat/use-cases/message-delivered.use-case';
import { MessageReadUseCase } from '../chat/use-cases/message-read.use-case';
import { generateRefreshToken, sha256Hex } from '../common/utils/crypto.util';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import type { HttpException } from '@nestjs/common';

/** DTO входящего сообщения token_refresh. */
interface TokenRefreshData {
  /** Opaque refresh-токен. */
  readonly refresh_token: string;
}

/** DTO входящего сообщения message_delivered. */
interface MessageDeliveredData {
  /** ID доставленного сообщения. */
  readonly message_id: string;
}

/** DTO входящего сообщения message_read. */
interface MessageReadData {
  /** ID прочитанного сообщения. */
  readonly message_id: string;
  /** ID чата (для определения отправителя). */
  readonly chat_id: string;
}

/** DTO входящего сообщения send_message. */
interface SendMessageData {
  /** ID чата. */
  readonly chat_id: string;
  /** Зашифрованный blob в base64. */
  readonly encrypted_blob: string;
}

/** WeakMap для хранения sessionId, связанного с каждым WebSocket-соединением. */
const socketSessionMap = new WeakMap<WebSocket, string>();

/** WSS-шлюз: авторизация по URL-параметру ?token=, token rotation, хранение соединений. */
@WebSocketGateway({ path: '/ws' })
export class WssGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /** Ссылка на WS-сервер (инжектируется NestJS). */
  @WebSocketServer()
  public server!: Server;

  public constructor(
    private readonly _store: WssConnectionStore,
    private readonly _jwtService: JwtService,
    @Inject(SessionRepository) private readonly _sessionRepo: SessionRepository,
    @Inject(ChatRepository) private readonly _chatRepo: ChatRepository,
    private readonly _sendMessageUseCase: SendMessageUseCase,
    private readonly _messageDeliveredUseCase: MessageDeliveredUseCase,
    private readonly _messageReadUseCase: MessageReadUseCase,
  ) {}

  /**
   * Валидирует JWT, регистрирует соединение, пушит накопленные pending_messages.
   * @param socket - WebSocket-соединение.
   * @param request - HTTP upgrade-запрос.
   */
  public async handleConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const token = this._extractToken(request);
    if (token === null) {
      socket.close(4001, 'missing_token');
      return;
    }

    let payload: JwtPayload;
    try {
      payload = this._jwtService.verify<JwtPayload>(token);
    } catch {
      socket.close(4001, 'invalid_token');
      return;
    }

    socketSessionMap.set(socket, payload.sessionId);
    this._store.add(payload.sessionId, payload.sub, socket);

    const pending = await this._chatRepo.findPendingMessagesByReceiver(payload.sessionId);
    for (const msg of pending) {
      if (socket.readyState !== 1 /* OPEN */) break;
      socket.send(JSON.stringify({
        event: 'message_new',
        data: {
          message_id: msg.id,
          chat_id: msg.chatId,
          sender_session_id: msg.senderSessionId,
          encrypted_blob: msg.encryptedBlob.toString('base64'),
        },
      }));
    }

    const keyRequests = await this._chatRepo.findPendingKeyRequestsForSession(payload.sessionId);
    for (const req of keyRequests) {
      if (socket.readyState !== 1 /* OPEN */) break;
      socket.send(JSON.stringify({
        event: 'chat_key_request',
        data: {
          chat_id: req.chatId,
          chat_name: req.chatName,
          peer_public_key: req.peerPublicKey,
          peer_session_id: req.peerSessionId,
        },
      }));
    }
  }

  /**
   * Удаляет соединение из стора при разрыве.
   * @param socket - Отключившийся сокет.
   */
  public handleDisconnect(socket: WebSocket): void {
    const sessionId = socketSessionMap.get(socket);
    if (sessionId !== undefined) {
      this._store.remove(sessionId);
      socketSessionMap.delete(socket);
    }
  }

  /**
   * Ротирует refresh-токен через WSS. Клиент присылает старый, получает новую пару токенов.
   * @param data - { refresh_token }.
   * @param socket - Сокет-отправитель.
   */
  @SubscribeMessage('token_refresh')
  public async handleTokenRefresh(
    @MessageBody() data: TokenRefreshData,
    @ConnectedSocket() socket: WebSocket,
  ): Promise<void> {
    if (data.refresh_token.length === 0) {
      socket.send(JSON.stringify({ event: 'error', data: { code: 'invalid_token' } }));
      return;
    }

    const oldHash = sha256Hex(data.refresh_token);
    const { raw: newRaw, hash: newHash } = generateRefreshToken();
    const session = await this._sessionRepo.rotateRefreshToken(oldHash, newHash);

    if (session === null) {
      socket.send(JSON.stringify({ event: 'error', data: { code: 'refresh_reused' } }));
      return;
    }

    const accessToken = await this._jwtService.signAsync({
      sub: session.accountId,
      sessionId: session.id,
      platform: session.platform,
      isAdmin: false,
    });

    socket.send(JSON.stringify({
      event: 'tokens_updated',
      data: { access_token: accessToken, refresh_token: newRaw },
    }));
  }

  /**
   * Принимает сообщение от клиента, сохраняет в pending_messages,
   * шлёт message_sent отправителю и message_new получателю (если онлайн).
   * @param data - { chat_id, encrypted_blob (base64) }.
   * @param socket - Сокет-отправитель.
   */
  @SubscribeMessage('send_message')
  public async handleSendMessage(
    @MessageBody() data: SendMessageData,
    @ConnectedSocket() socket: WebSocket,
  ): Promise<void> {
    const sessionId = socketSessionMap.get(socket);
    if (sessionId === undefined) return;

    let result: Awaited<ReturnType<SendMessageUseCase['execute']>>;
    try {
      result = await this._sendMessageUseCase.execute(
        sessionId,
        data.chat_id ?? '',
        data.encrypted_blob ?? '',
      );
    } catch (err: unknown) {
      const response = (err as HttpException).getResponse?.() as { code?: string } | undefined;
      socket.send(JSON.stringify({
        event: 'error',
        data: { code: response?.code ?? 'internal_error' },
      }));
      return;
    }

    socket.send(JSON.stringify({
      event: 'message_sent',
      data: { message_id: result.messageId, chat_id: result.chatId },
    }));

    this._store.sendToSession(result.receiverSessionId, 'message_new', {
      message_id: result.messageId,
      chat_id: result.chatId,
      sender_session_id: sessionId,
      encrypted_blob: result.encryptedBlobBase64,
    });
  }

  /**
   * Получатель подтверждает доставку сообщения. Удаляет blob, шлёт message_delivered отправителю.
   * @param data - { message_id }.
   * @param socket - Сокет получателя.
   */
  @SubscribeMessage('message_delivered')
  public async handleMessageDelivered(
    @MessageBody() data: MessageDeliveredData,
    @ConnectedSocket() socket: WebSocket,
  ): Promise<void> {
    const sessionId = socketSessionMap.get(socket);
    if (sessionId === undefined) return;

    let result: Awaited<ReturnType<MessageDeliveredUseCase['execute']>>;
    try {
      result = await this._messageDeliveredUseCase.execute(sessionId, data.message_id ?? '');
    } catch (err: unknown) {
      const response = (err as HttpException).getResponse?.() as { code?: string } | undefined;
      socket.send(JSON.stringify({
        event: 'error',
        data: { code: response?.code ?? 'internal_error' },
      }));
      return;
    }

    this._store.sendToSession(result.senderSessionId, 'message_delivered', {
      message_id: result.messageId,
      chat_id: result.chatId,
    });
  }

  /**
   * Relay message_read: получатель прочитал сообщение — уведомляет отправителя.
   * @param data - { message_id, chat_id }.
   * @param socket - Сокет читателя.
   */
  @SubscribeMessage('message_read')
  public async handleMessageRead(
    @MessageBody() data: MessageReadData,
    @ConnectedSocket() socket: WebSocket,
  ): Promise<void> {
    const sessionId = socketSessionMap.get(socket);
    if (sessionId === undefined) return;

    let result: Awaited<ReturnType<MessageReadUseCase['execute']>>;
    try {
      result = await this._messageReadUseCase.execute(sessionId, data.message_id ?? '', data.chat_id ?? '');
    } catch (err: unknown) {
      const response = (err as HttpException).getResponse?.() as { code?: string } | undefined;
      socket.send(JSON.stringify({
        event: 'error',
        data: { code: response?.code ?? 'internal_error' },
      }));
      return;
    }

    this._store.sendToSession(result.senderSessionId, 'message_read', {
      message_id: result.messageId,
      chat_id: result.chatId,
    });
  }

  /**
   * Отвечает на ping клиента сообщением pong.
   * @param socket - Сокет-отправитель.
   */
  @SubscribeMessage('ping')
  public handlePing(@ConnectedSocket() socket: WebSocket): void {
    socket.send(JSON.stringify({ event: 'pong', data: {} }));
  }

  /**
   * Извлекает access-токен из query-параметра ?token= в URL upgrade-запроса.
   * @param request - HTTP upgrade-запрос.
   * @returns Строка токена или null.
   */
  private _extractToken(request: IncomingMessage): string | null {
    const url = request.url;
    if (url === undefined) {
      return null;
    }
    const match = /[?&]token=([^&]+)/.exec(url);
    const raw = match?.[1];
    return raw !== undefined ? decodeURIComponent(raw) : null;
  }
}
