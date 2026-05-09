import { Injectable } from '@nestjs/common';
import type { WebSocket } from 'ws';

/** Запись об активном WSS-соединении. */
interface ConnectionEntry {
  /** Веб-сокет клиента. */
  readonly socket: WebSocket;
  /** ID аккаунта. */
  readonly accountId: string;
}

/** Глобальное хранилище активных WSS-соединений. sessionId → { socket, accountId }. */
@Injectable()
export class WssConnectionStore {
  /** Map sessionId → ConnectionEntry для активных соединений. */
  private readonly _connections: Map<string, ConnectionEntry> = new Map<string, ConnectionEntry>();

  /**
   * Регистрирует соединение.
   * @param sessionId - ID сессии из JWT.
   * @param accountId - ID аккаунта из JWT.
   * @param socket - WebSocket-объект.
   */
  public add(sessionId: string, accountId: string, socket: WebSocket): void {
    this._connections.set(sessionId, { socket, accountId });
  }

  /**
   * Удаляет соединение по ID сессии.
   * @param sessionId - ID сессии.
   */
  public remove(sessionId: string): void {
    this._connections.delete(sessionId);
  }

  /**
   * Отправляет событие конкретной сессии.
   * @param sessionId - ID сессии.
   * @param event - Имя события.
   * @param data - Данные события.
   */
  public sendToSession(sessionId: string, event: string, data: object = {}): void {
    const entry = this._connections.get(sessionId);
    if (entry?.socket.readyState === 1 /* OPEN */) {
      entry.socket.send(JSON.stringify({ event, data }));
    }
  }

  /**
   * Отправляет событие всем активным сессиям аккаунта.
   * @param accountId - ID аккаунта.
   * @param event - Имя события.
   * @param data - Данные события.
   */
  public sendToAccount(accountId: string, event: string, data: object = {}): void {
    const payload = JSON.stringify({ event, data });
    for (const [, entry] of this._connections) {
      if (entry.accountId === accountId && entry.socket.readyState === 1) {
        entry.socket.send(payload);
      }
    }
  }

  /**
   * Отправляет событие всем активным сессиям аккаунта, кроме указанной.
   * Используется для уведомления других устройств без эха на инициатора.
   * @param accountId - ID аккаунта.
   * @param excludeSessionId - ID сессии-инициатора (не получит событие).
   * @param event - Имя события.
   * @param data - Данные события.
   */
  public sendToAccountExcept(accountId: string, excludeSessionId: string, event: string, data: object = {}): void {
    const payload = JSON.stringify({ event, data });
    for (const [sessionId, entry] of this._connections) {
      if (sessionId !== excludeSessionId && entry.accountId === accountId && entry.socket.readyState === 1) {
        entry.socket.send(payload);
      }
    }
  }
}
