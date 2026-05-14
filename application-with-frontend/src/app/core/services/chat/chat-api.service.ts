import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../api/api-config';

/* eslint-disable @typescript-eslint/naming-convention -- API использует snake_case */

/** Данные собеседника в ответе GET /chat/read-list. */
export interface ApiChatPeer {
  /** ID сессии устройства. */
  readonly session_id: string;
  /** Системное имя устройства. */
  readonly system_name: string;
  /** Прозвище устройства или null. */
  readonly device_nickname: string | null;
  /** ID аккаунта собеседника. */
  readonly account_id: string;
  /** UIN или null. */
  readonly uin: string | null;
  /** Никнейм или null. */
  readonly nickname: string | null;
  /** Username или null. */
  readonly username: string | null;
}

/** Чат в ответе GET /chat/read-list. */
export interface ApiChat {
  /** ID чата. */
  readonly id: string;
  /** Название чата. */
  readonly name: string;
  /** Статус чата. */
  readonly status: 'pending_key' | 'active' | 'is_dead';
  /** ISO-8601 дата создания. */
  readonly created_at: string;
  /** Данные собеседника. */
  readonly peer: ApiChatPeer;
}

/** Осиротевший собеседник в ответе GET /chat/read-orphan-peers. */
export interface ApiOrphanPeer {
  /** ID аккаунта собеседника. */
  readonly account_id: string;
  /** UIN или null. */
  readonly uin: string | null;
  /** Никнейм или null. */
  readonly nickname: string | null;
  /** Username или null. */
  readonly username: string | null;
  /** ISO-8601 время последнего чата. */
  readonly last_chat_at: string;
}

/** Тело запроса POST /chat/create. */
interface CreateChatRequest {
  /** Название чата. */
  readonly name: string;
  /** ID сессии получателя. */
  readonly receiver_session_id: string;
}

/** Ответ POST /chat/create. */
export interface ApiCreatedChat {
  /** ID нового чата. */
  readonly id: string;
  /** Название чата. */
  readonly name: string;
  /** ID первой сессии (lexicographic min). */
  readonly session_a_id: string;
  /** ID второй сессии (lexicographic max). */
  readonly session_b_id: string;
  /** Статус чата. */
  readonly status: 'pending_key' | 'active';
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}

/* eslint-enable @typescript-eslint/naming-convention */

/** HTTP-клиент для эндпоинтов /chat/*. */
@Injectable({ providedIn: 'root' })
export class ChatApiService {
  /** HTTP-клиент для запросов. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /**
   * Возвращает список чатов текущей сессии с данными собеседника (GET /chat/read-list).
   * @returns Массив чатов, сортировка по created_at DESC.
   */
  public readList(): Observable<readonly ApiChat[]> {
    return this._http.get<readonly ApiChat[]>(`${this._baseUrl}/chat/read-list`);
  }

  /**
   * Возвращает осиротевших собеседников — аккаунты с чатами с других сессий, но без чатов с текущей (GET /chat/read-orphan-peers).
   * @returns Массив осиротевших собеседников, сортировка по last_chat_at DESC.
   */
  public readOrphanPeers(): Observable<readonly ApiOrphanPeer[]> {
    return this._http.get<readonly ApiOrphanPeer[]>(`${this._baseUrl}/chat/read-orphan-peers`);
  }

  /**
   * Создаёт чат между текущей сессией и выбранным устройством собеседника (POST /chat/create).
   * @param name - Название чата.
   * @param receiverSessionId - ID сессии-получателя.
   * @returns Созданный чат.
   * @throws HttpErrorResponse 404 `session_not_found` если сессия не найдена.
   * @throws HttpErrorResponse 409 `chat_name_taken` если имя уже занято у этой пары.
   */
  public create(name: string, receiverSessionId: string): Observable<ApiCreatedChat> {
    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    const body: CreateChatRequest = { name, receiver_session_id: receiverSessionId };
    /* eslint-enable @typescript-eslint/naming-convention */
    return this._http.post<ApiCreatedChat>(`${this._baseUrl}/chat/create`, body);
  }

  /**
   * Загружает публичный ECDH-ключ текущей сессии в чат (PATCH /chat/submit-key).
   * Если второй ключ — сервер обнуляет оба ключа, статус → active, обе стороны получают WSS chat_key_ready.
   * Если первый — peer получает WSS chat_key_request с нашим публичным ключом.
   * @param chatId - ID чата.
   * @param publicKey - X25519 публичный ключ (base64, raw 32 байта).
   * @returns Пустой Observable (204).
   * @throws HttpErrorResponse 404 `chat_not_found`.
   * @throws HttpErrorResponse 403 `not_your_chat`.
   */
  public submitKey(chatId: string, publicKey: string): Observable<unknown> {
    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    return this._http.patch(`${this._baseUrl}/chat/submit-key`, {
      chat_id: chatId,
      public_key: publicKey,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  }

  /**
   * Удаляет чат по ID (DELETE /chat/delete/:id).
   * @param id - ID чата.
   * @returns Пустой Observable (204).
   * @throws HttpErrorResponse 404 `chat_not_found`.
   * @throws HttpErrorResponse 403 `not_your_chat`.
   */
  public delete(id: string): Observable<unknown> {
    return this._http.delete(`${this._baseUrl}/chat/delete/${id}`);
  }
}
