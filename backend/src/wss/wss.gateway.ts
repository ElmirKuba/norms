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
import { generateRefreshToken, sha256Hex } from '../common/utils/crypto.util';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

/** DTO входящего сообщения token_refresh. */
interface TokenRefreshData {
  /** Opaque refresh-токен. */
  readonly refresh_token: string;
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
  ) {}

  /**
   * Валидирует JWT из ?token= при установке соединения. Закрывает сокет при ошибке.
   * @param socket - WebSocket-соединение.
   * @param request - HTTP upgrade-запрос.
   */
  public handleConnection(socket: WebSocket, request: IncomingMessage): void {
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
