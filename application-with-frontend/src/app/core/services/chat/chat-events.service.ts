import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Subject } from 'rxjs';
import { WssService } from '../wss/wss.service';
import type { WssChatDeletedData, WssChatKeyReadyData, WssChatKeyRequestData, WssMessageNewData, WssMessageStatusData } from '../wss/wss.service';
import { LocalChatRepository } from '../local-db/local-chat.repository';
import type { LocalChat, LocalChatKey, LocalMessage, LocalPeerDevice } from '../local-db/local-db.types';
import { CryptoService } from '../crypto/crypto.service';
import { MasterKeyService } from '../crypto/master-key.service';
import { ChatApiService } from './chat-api.service';

/**
 * Глобальный обработчик WSS-событий чата.
 *
 * Отвечает за: получение и расшифровку входящих сообщений, шифрование исходящих,
 * обмен ECDH-ключами (chat_key_ready / chat_key_request), Double Ratchet (DH-шаг
 * при каждом новом рачет-ключе собеседника) и ведение in-memory AES-кеша.
 * Активируется один раз в APP_INITIALIZER через init().
 */
@Injectable({ providedIn: 'root' })
export class ChatEventsService {
  /**
   * Эмитирует chatId когда ECDH-обмен завершён и AES-ключ готов к использованию.
   * ChatDetailComponent подписывается для сброса сообщений из pending_key очереди.
   */
  public readonly chatActivated$: Subject<string> = new Subject<string>();

  /**
   * Эмитирует LocalMessage после расшифровки и сохранения входящего сообщения в SQLite.
   * ChatDetailComponent подписывается для отображения новых сообщений без повторного decrypt.
   */
  public readonly incomingMessage$: Subject<LocalMessage> = new Subject<LocalMessage>();

  /**
   * Эмитирует ID чата после сохранения нового входящего чата (chat_key_request).
   * ChatsComponent подписывается для перезагрузки списка.
   */
  public readonly chatReceived$: Subject<string> = new Subject<string>();

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
   * In-memory кэш AES-ключей чатов (текущий ключ).
   * Обновляется при: 1) завершении ECDH-обмена; 2) каждом DH-рачет-шаге; 3) первом decrypt/send (из SQLite).
   * Очищается при logout (сервис singleton, пересоздаётся при перезагрузке).
   */
  private readonly _aesKeyCache: Map<string, CryptoKey> = new Map<string, CryptoKey>();

  /**
   * Флаг первичной инициализации — защищает от повторного вызова init().
   * false до первого вызова, true после — повторные вызовы игнорируются.
   */
  private _initialized: boolean = false;

  /**
   * Подписывается на все WSS-события чата.
   * Идемпотентен — повторный вызов игнорируется.
   * Вызывать из APP_INITIALIZER и из login/create-account компонентов.
   */
  public init(): void {
    if (this._initialized) return;
    this._initialized = true;
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
   * Всегда включает текущий рачет-публичный ключ в заголовок для Double Ratchet.
   * @param chatId - ID активного чата.
   * @param content - Открытый текст сообщения.
   * @returns true если сообщение отправлено, false если WSS не подключён или нет AES-ключа.
   */
  public async sendMessage(chatId: string, content: string): Promise<boolean> {
    const aesKey = await this._getAesKey(chatId);
    if (aesKey === null) return false;

    // Forward secrecy не в MVP — Double Ratchet отключён, всегда шифруем начальным K0.
    // Поля myRatchetPubKey / myRatchetEncryptedPrivKey в chat_keys остаются как dormant
    // инфраструктура для будущей реализации форвард-секретности.
    const ratchetPubKey: string | null = null;

    const encryptedBlob = await this._crypto.encryptMessage(content, aesKey, ratchetPubKey);

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    return this._wss.send('send_message', {
      chat_id: chatId,
      encrypted_blob: encryptedBlob,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
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
   * Расшифровывает входящий blob с поддержкой Double Ratchet и fallback на предыдущий ключ.
   *
   * Порядок попыток:
   * 1. Текущий AES-ключ — стандартный случай.
   * 2. Кандидат от DH-рачета — если текущий не подошёл, а собеседник прислал новый рачет-ключ.
   * 3. Предыдущий AES-ключ — для сообщений «в пути» отправленных до нашего рачет-шага.
   * @param chatId - ID чата.
   * @param blob - base64 зашифрованного blob.
   * @returns Расшифрованный текст или строка-заглушка.
   */
  private async _decryptIncoming(chatId: string, blob: string): Promise<string> {
    const keyRecord = await this._chatRepo.getChatKey(chatId);
    if (keyRecord === null || keyRecord.encryptedKey === '') {
      /* eslint-disable no-console */
      console.warn(`[DECRYPT] chatId=${chatId.slice(-6)} NO AES key (encryptedKey=${keyRecord?.encryptedKey === '' ? 'empty' : 'null record'})`);
      /* eslint-enable no-console */
      return '[зашифровано]';
    }

    const masterKey = await this._masterKey.getOrCreate();

    let currentKey = this._aesKeyCache.get(chatId);
    if (currentKey === undefined) {
      currentKey = await this._crypto.unwrapAesKey(keyRecord.encryptedKey, keyRecord.keyIv, masterKey);
      this._aesKeyCache.set(chatId, currentKey);
    }

    // Попытка 1: текущий ключ
    try {
      const result = await this._crypto.decryptMessage(blob, currentKey);
      if (this._isPeerRatchetKeyNew(result.peerRatchetPubKeyBase64, keyRecord)) {
        await this._advanceRatchet(chatId, keyRecord, result.peerRatchetPubKeyBase64, masterKey);
      }
      return result.content;
    } catch { /* текущий ключ не подошёл */ }

    // Попытка 2: DH-рачет-кандидат (собеседник уже провёл рачет, мы ещё нет)
    const peerNewPub = this._crypto.parseRatchetPubKey(blob);
    if (
      this._isPeerRatchetKeyNew(peerNewPub, keyRecord) &&
      keyRecord.myRatchetEncryptedPrivKey !== null &&
      keyRecord.myRatchetPrivKeyIv !== null
    ) {
      const myRatchetPriv = await this._crypto.unwrapEcdhPrivateKey(
        keyRecord.myRatchetEncryptedPrivKey,
        keyRecord.myRatchetPrivKeyIv,
        masterKey,
      );
      const peerPub = await this._crypto.importPublicKey(peerNewPub);
      const candidateKey = await this._crypto.deriveRatchetAesKey(myRatchetPriv, peerPub);
      try {
        const result = await this._crypto.decryptMessage(blob, candidateKey);
        // Кандидат подошёл — фиксируем рачет-шаг
        this._aesKeyCache.set(chatId, candidateKey);
        await this._commitRatchet(chatId, keyRecord, peerNewPub, candidateKey, masterKey);
        return result.content;
      } catch { /* кандидат не подошёл */ }
    }

    // Попытка 3: предыдущий ключ (сообщение «в пути» до нашего рачет-шага)
    if (keyRecord.prevEncryptedKey !== '') {
      try {
        const prevKey = await this._crypto.unwrapAesKey(keyRecord.prevEncryptedKey, keyRecord.prevKeyIv, masterKey);
        const result = await this._crypto.decryptMessage(blob, prevKey);
        return result.content;
      } catch { /* предыдущий ключ не подошёл */ }
    }

    /* eslint-disable no-console */
    console.warn(`[DECRYPT] chatId=${chatId.slice(-6)} ALL keys failed → [не удалось расшифровать]`);
    /* eslint-enable no-console */
    return '[не удалось расшифровать]';
  }

  /**
   * Проверяет, является ли рачет-публичный ключ собеседника новым (ранее не виденным).
   * @param peerPubKeyBase64 - Полученный рачет-ключ собеседника или null.
   * @param keyRecord - Текущая запись ключей чата из SQLite.
   * @returns true если ключ новый и требует DH-рачет-шага.
   */
  private _isPeerRatchetKeyNew(
    peerPubKeyBase64: string | null,
    keyRecord: LocalChatKey,
  ): peerPubKeyBase64 is string {
    return peerPubKeyBase64 !== null && peerPubKeyBase64 !== keyRecord.peerRatchetPubKey;
  }

  /**
   * Выполняет DH-рачет-шаг: выводит новый AES-ключ и генерирует новую рачет-пару.
   * Вызывается когда расшифровка удалась текущим ключом, но собеседник прислал новый рачет-ключ.
   * @param chatId - ID чата.
   * @param keyRecord - Текущая запись ключей из SQLite.
   * @param peerNewPubKeyBase64 - Новый рачет-публичный ключ собеседника (base64).
   * @param masterKey - Мастер-ключ устройства.
   */
  private async _advanceRatchet(
    chatId: string,
    keyRecord: LocalChatKey,
    peerNewPubKeyBase64: string,
    masterKey: CryptoKey,
  ): Promise<void> {
    if (keyRecord.myRatchetEncryptedPrivKey === null || keyRecord.myRatchetPrivKeyIv === null) return;

    const myRatchetPriv = await this._crypto.unwrapEcdhPrivateKey(
      keyRecord.myRatchetEncryptedPrivKey,
      keyRecord.myRatchetPrivKeyIv,
      masterKey,
    );
    const peerNewPub = await this._crypto.importPublicKey(peerNewPubKeyBase64);
    const newAesKey = await this._crypto.deriveRatchetAesKey(myRatchetPriv, peerNewPub);
    this._aesKeyCache.set(chatId, newAesKey);
    await this._commitRatchet(chatId, keyRecord, peerNewPubKeyBase64, newAesKey, masterKey);
  }

  /**
   * Фиксирует результат рачет-шага в SQLite: записывает новый AES-ключ,
   * перемещает текущий в prev и генерирует новую рачет-пару.
   * @param chatId - ID чата.
   * @param keyRecord - Запись ключей до рачет-шага (для prev_key).
   * @param peerNewPubKeyBase64 - Новый рачет-публичный ключ собеседника (base64).
   * @param newAesKey - Новый AES-ключ (уже вычисленный).
   * @param masterKey - Мастер-ключ устройства.
   */
  private async _commitRatchet(
    chatId: string,
    keyRecord: LocalChatKey,
    peerNewPubKeyBase64: string,
    newAesKey: CryptoKey,
    masterKey: CryptoKey,
  ): Promise<void> {
    const newRatchetPair = await this._crypto.generateEcdhKeyPair();
    const newRatchetPubBase64 = await this._crypto.exportPublicKey(newRatchetPair.publicKey);
    const wrappedNewRatchetPriv = await this._crypto.wrapEcdhPrivateKey(newRatchetPair.privateKey, masterKey);
    const wrappedNewAes = await this._crypto.wrapAesKey(newAesKey, masterKey);

    await this._chatRepo.updateChatKeyRatchet(chatId, {
      encryptedKey: wrappedNewAes.encryptedKey,
      keyIv: wrappedNewAes.keyIv,
      prevEncryptedKey: keyRecord.encryptedKey,
      prevKeyIv: keyRecord.keyIv,
      myRatchetEncryptedPrivKey: wrappedNewRatchetPriv.encryptedKey,
      myRatchetPrivKeyIv: wrappedNewRatchetPriv.keyIv,
      myRatchetPubKey: newRatchetPubBase64,
      peerRatchetPubKey: peerNewPubKeyBase64,
    });
  }

  /**
   * Обмен ключами завершён: обе стороны загрузили публичные ключи.
   * Извлекает наш приватный ключ, выводит AES-ключ, генерирует первую рачет-пару,
   * кэширует и сохраняет в SQLite.
   * @param data - Данные события chat_key_ready.
   */
  private async _handleChatKeyReady(data: WssChatKeyReadyData): Promise<void> {
    const { chatId, peerPublicKey } = data;

    const keyRecord = await this._chatRepo.getChatKey(chatId);
    if (keyRecord === null) {
      /* eslint-disable no-console */
      console.warn(`[ECDH] chat_key_ready: NO key record for ${chatId.slice(-6)} — MISSING`);
      /* eslint-enable no-console */
      return;
    }
    if (keyRecord.encryptedPrivKey === null || keyRecord.privKeyIv === null) {
      /* eslint-disable no-console */
      console.warn(`[ECDH] chat_key_ready: encryptedPrivKey=null for ${chatId.slice(-6)} — RETURNING EARLY`);
      /* eslint-enable no-console */
      return;
    }

    const masterKey = await this._masterKey.getOrCreate();

    const myPrivKey = await this._crypto.unwrapEcdhPrivateKey(
      keyRecord.encryptedPrivKey,
      keyRecord.privKeyIv,
      masterKey,
    );
    const peerPubKey = await this._crypto.importPublicKey(peerPublicKey);
    const aesKey = await this._crypto.deriveAesKey(myPrivKey, peerPubKey);

    this._aesKeyCache.set(chatId, aesKey);

    // Генерируем первую рачет-пару для Double Ratchet
    const ratchetPair = await this._crypto.generateEcdhKeyPair();
    const ratchetPubBase64 = await this._crypto.exportPublicKey(ratchetPair.publicKey);
    const wrappedRatchetPriv = await this._crypto.wrapEcdhPrivateKey(ratchetPair.privateKey, masterKey);
    const wrappedAes = await this._crypto.wrapAesKey(aesKey, masterKey);

    const updatedKey: LocalChatKey = {
      chatId,
      encryptedKey: wrappedAes.encryptedKey,
      keyIv: wrappedAes.keyIv,
      encryptedPrivKey: null,
      privKeyIv: null,
      prevEncryptedKey: '',
      prevKeyIv: '',
      myRatchetEncryptedPrivKey: wrappedRatchetPriv.encryptedKey,
      myRatchetPrivKeyIv: wrappedRatchetPriv.keyIv,
      myRatchetPubKey: ratchetPubBase64,
      peerRatchetPubKey: null,
      createdAt: keyRecord.createdAt,
    };
    await this._chatRepo.saveChatKey(updatedKey);
    await this._chatRepo.updateChatStatus(chatId, 'active');

    this.chatActivated$.next(chatId);
  }

  /**
   * Первый из двух участников загрузил ключ: генерируем свою пару, отвечаем.
   * После нашего submit-key сервер пришлёт chat_key_ready обеим сторонам.
   * @param data - Данные события chat_key_request.
   */
  private async _handleChatKeyRequest(data: WssChatKeyRequestData): Promise<void> {
    const { chatId, chatName, chatCreatedAt, peerSessionId } = data;

    // Сохраняем чат локально если есть данные (peer получает чат через это событие)
    if (peerSessionId !== undefined) {
      const now = Date.now();
      const createdAt = chatCreatedAt !== undefined ? new Date(chatCreatedAt).getTime() : now;

      // Сохраняем peer_devices ПЕРЕД chat'ом — JOIN при отображении чата опирается на эту запись.
      // Если peer-инфа есть в payload (новый формат) — пишем; иначе оставляем без peer_devices
      // (старый формат для обратной совместимости с не-обновлённым бэкендом).
      if (data.peerAccountId !== undefined && data.peerSystemName !== undefined) {
        const peer: LocalPeerDevice = {
          sessionId: peerSessionId,
          accountId: data.peerAccountId,
          uin: data.peerUin ?? null,
          nickname: data.peerNickname ?? null,
          username: data.peerUsername ?? null,
          systemName: data.peerSystemName,
          deviceNickname: data.peerDeviceNickname ?? null,
        };
        await this._chatRepo.upsertPeerDevice(peer);
      }

      const chat: LocalChat = {
        id: chatId,
        name: chatName ?? chatId,
        status: 'pending_key',
        peerSessionId,
        createdAt,
        updatedAt: now,
      };
      await this._chatRepo.upsertChat(chat);
      this.chatReceived$.next(chatId);
    }

    const keyPair = await this._crypto.generateEcdhKeyPair();
    const publicKeyB64 = await this._crypto.exportPublicKey(keyPair.publicKey);

    // Сохраняем приватный ключ ДО submit — иначе chat_key_ready может прийти
    // раньше чем saveChatKey завершится, и _handleChatKeyReady не найдёт запись.
    const masterKey = await this._masterKey.getOrCreate();
    const wrapped = await this._crypto.wrapEcdhPrivateKey(keyPair.privateKey, masterKey);

    const chatKey: LocalChatKey = {
      chatId,
      encryptedKey: '',
      keyIv: '',
      encryptedPrivKey: wrapped.encryptedKey,
      privKeyIv: wrapped.keyIv,
      prevEncryptedKey: '',
      prevKeyIv: '',
      myRatchetEncryptedPrivKey: null,
      myRatchetPrivKeyIv: null,
      myRatchetPubKey: null,
      peerRatchetPubKey: null,
      createdAt: Date.now(),
    };
    await this._chatRepo.saveChatKey(chatKey);

    await firstValueFrom(this._chatApi.submitKey(chatId, publicKeyB64));
    // chat_key_ready придёт следом → _handleChatKeyReady сгенерирует рачет-пару
  }

  /**
   * Расшифровывает входящее сообщение, сохраняет в SQLite,
   * эмитирует incomingMessage$ и подтверждает доставку по WSS.
   * @param data - Данные события message_new.
   */
  private async _handleMessageNew(data: WssMessageNewData): Promise<void> {
    const content = await this._decryptIncoming(data.chatId, data.encryptedBlob);

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

    this.incomingMessage$.next(msg);

    /* eslint-disable @typescript-eslint/naming-convention -- snake_case соответствует API-контракту */
    this._wss.send('message_delivered', {
      message_id: data.messageId,
      chat_id: data.chatId,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}
