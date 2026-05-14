import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Subject } from 'rxjs';
import { WssService } from '../wss/wss.service';
import type { WssChatDeletedData, WssChatKeyReadyData, WssChatKeyRequestData, WssMessageNewData, WssMessageStatusData } from '../wss/wss.service';
import { LocalChatRepository } from '../local-db/local-chat.repository';
import type { LocalChatKey, LocalMessage } from '../local-db/local-db.types';
import { CryptoService } from '../crypto/crypto.service';
import { MasterKeyService } from '../crypto/master-key.service';
import { ChatApiService } from './chat-api.service';

/**
 * Глобальный обработчик WSS-событий чата.
 * Отвечает за: получение и расшифровку входящих сообщений, отправку исходящих,
 * обмен ECDH-ключами (chat_key_ready / chat_key_request) и ведение in-memory AES-кеша.
 * Активируется один раз в APP_INITIALIZER через init().
 */
@Injectable({ providedIn: 'root' })
export class ChatEventsService {
  /**
   * Эмитирует chatId когда ECDH-обмен завершён и AES-ключ готов к использованию.
   * ChatDetailComponent подписывается для сброса сообщений из pending_key очереди.
   */
  public readonly chatActivated$: Subject<string> = new Subject<string>();

  /** WSS-сервис. */
  private readonly _wss: WssService = inject(WssService);

  /** Репозиторий локальной БД. */
  private readonly _chatRepo: LocalChatRepository = inject(LocalChatRepository);

  /** Сервис криптографических примитивов. */
  private readonly _crypto: CryptoService = inject(CryptoService);

  /** Сервис мастер-ключа устройства. */
  private readonly _masterKey: MasterKeyService = inject(MasterKeyService);

  /** HTTP-клиент для /chat/*. */
  private readonly _chatApi: ChatApiService = inject(ChatApiService);

  /**
   * In-memory кэш AES-ключей чатов.
   * Заполняется при: 1) chat_key_ready (новый обмен); 2) первом decrypt/send (из SQLite).
   * Очищается при logout (сервис singleton, пересоздаётся при перезагрузке).
   */
  private readonly _aesKeyCache: Map<string, CryptoKey> = new Map<string, CryptoKey>();

  /**
   * Подписывается на все WSS-события чата.
   * Вызывать один раз из APP_INITIALIZER перед wss.connect().
   */
  public init(): void {
    this._wss.messageNew$.subscribe((data: WssMessageNewData): void => {
      void this._handleMessageNew(data);
    });
    this._wss.messageDelivered$.subscribe((data: WssMessageStatusData): void => {
      void this._chatRepo.updateMessageStatus(data.messageId, 'delivered');
    });
    this._wss.messageRead$.subscribe((data: WssMessageStatusData): void => {
      void this._chatRepo.updateMessageStatus(data.messageId, 'read');
    });
    this._wss.chatDeleted$.subscribe((data: WssChatDeletedData): void => {
      void this._chatRepo.updateChatStatus(data.chatId, 'is_dead');
    });
    this._wss.chatKeyReady$.subscribe((data: WssChatKeyReadyData): void => {
      void this._handleChatKeyReady(data);
    });
    this._wss.chatKeyRequest$.subscribe((data: WssChatKeyRequestData): void => {
      void this._handleChatKeyRequest(data);
    });
  }

  /**
   * Шифрует content и отправляет по WSS send_message.
   * @param chatId - ID активного чата.
   * @param content - Открытый текст сообщения.
   * @returns true если сообщение отправлено, false если WSS не подключён.
   */
  public async sendMessage(chatId: string, content: string): Promise<boolean> {
    const aesKey = await this._getAesKey(chatId);
    if (aesKey === null) return false;

    const encryptedBlob = await this._crypto.encrypt(content, aesKey);

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    return this._wss.send('send_message', {
      chat_id: chatId,
      encrypted_blob: encryptedBlob,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  }

  /**
   * Расшифровывает AES-256-GCM blob в текст.
   * При отсутствии ключа или ошибке расшифровки — возвращает заглушку.
   * @param chatId - ID чата (для поиска AES-ключа).
   * @param blob - base64-blob формата [iv:12][ciphertext+tag].
   * @returns Расшифрованный текст или '[зашифровано]'.
   */
  public async decryptBlob(chatId: string, blob: string): Promise<string> {
    const aesKey = await this._getAesKey(chatId);
    if (aesKey === null) return '[зашифровано]';
    try {
      return await this._crypto.decrypt(blob, aesKey);
    } catch {
      return '[не удалось расшифровать]';
    }
  }

  /**
   * Возвращает AES-ключ чата: сначала из кэша, затем из SQLite.
   * Возвращает null если ключ ещё не получен (pending_key фаза).
   * @param chatId - ID чата.
   * @returns AES-256-GCM CryptoKey или null.
   */
  private async _getAesKey(chatId: string): Promise<CryptoKey | null> {
    const cached = this._aesKeyCache.get(chatId);
    if (cached !== undefined) return cached;

    const keyRecord = await this._chatRepo.getChatKey(chatId);
    if (keyRecord === null || keyRecord.encryptedKey === '') return null;

    const masterKey = await this._masterKey.getOrCreate();
    const aesKey = await this._crypto.unwrapAesKey(keyRecord.encryptedKey, keyRecord.keyIv, masterKey);
    this._aesKeyCache.set(chatId, aesKey);
    return aesKey;
  }

  /**
   * Обмен ключами завершён: обе стороны загрузили публичные ключи.
   * Извлекает наш приватный ключ, выводит AES-ключ, кэширует, сохраняет в SQLite.
   * @param data - Данные события chat_key_ready.
   */
  private async _handleChatKeyReady(data: WssChatKeyReadyData): Promise<void> {
    const { chatId, peerPublicKey } = data;

    const keyRecord = await this._chatRepo.getChatKey(chatId);
    if (keyRecord === null) return;
    if (keyRecord.encryptedPrivKey === null || keyRecord.privKeyIv === null) return;

    const masterKey = await this._masterKey.getOrCreate();

    const myPrivKey = await this._crypto.unwrapEcdhPrivateKey(
      keyRecord.encryptedPrivKey,
      keyRecord.privKeyIv,
      masterKey,
    );
    const peerPubKey = await this._crypto.importPublicKey(peerPublicKey);
    const aesKey = await this._crypto.deriveAesKey(myPrivKey, peerPubKey);

    this._aesKeyCache.set(chatId, aesKey);

    const wrapped = await this._crypto.wrapAesKey(aesKey, masterKey);
    const updatedKey: LocalChatKey = {
      chatId,
      encryptedKey: wrapped.encryptedKey,
      keyIv: wrapped.keyIv,
      encryptedPrivKey: null,
      privKeyIv: null,
      createdAt: keyRecord.createdAt,
    };
    await this._chatRepo.saveChatKey(updatedKey);
    await this._chatRepo.updateChatStatus(chatId, 'active');

    this.chatActivated$.next(chatId);
  }

  /**
   * Первый из двух участников загрузил ключ: генерируем своту пару, отвечаем.
   * После нашего submit-key сервер пришлёт chat_key_ready обеим сторонам.
   * @param data - Данные события chat_key_request.
   */
  private async _handleChatKeyRequest(data: WssChatKeyRequestData): Promise<void> {
    const { chatId } = data;

    const keyPair = await this._crypto.generateEcdhKeyPair();
    const publicKeyB64 = await this._crypto.exportPublicKey(keyPair.publicKey);

    await firstValueFrom(this._chatApi.submitKey(chatId, publicKeyB64));

    const masterKey = await this._masterKey.getOrCreate();
    const wrapped = await this._crypto.wrapEcdhPrivateKey(keyPair.privateKey, masterKey);

    const chatKey: LocalChatKey = {
      chatId,
      encryptedKey: '',
      keyIv: '',
      encryptedPrivKey: wrapped.encryptedKey,
      privKeyIv: wrapped.keyIv,
      createdAt: Date.now(),
    };
    await this._chatRepo.saveChatKey(chatKey);
    // chat_key_ready придёт следом → _handleChatKeyReady завершит деривацию
  }

  /**
   * Расшифровывает входящее сообщение, сохраняет в SQLite и подтверждает доставку.
   * @param data - Данные события message_new.
   */
  private async _handleMessageNew(data: WssMessageNewData): Promise<void> {
    const content = await this.decryptBlob(data.chatId, data.encryptedBlob);

    const msg: LocalMessage = {
      id: data.messageId,
      chatId: data.chatId,
      senderSessionId: data.senderSessionId,
      content,
      status: 'delivered',
      isOutgoing: false,
      createdAt: Date.now(),
    };

    await this._chatRepo.saveMessage(msg);
    await this._chatRepo.updateChatStatus(data.chatId, 'active');

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    this._wss.send('message_delivered', {
      message_id: data.messageId,
      chat_id: data.chatId,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}
