import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SessionApiService } from '../../../../../core/services/session/session-api.service';
import type { ApiPeerSession } from '../../../../../core/services/session/session-api.service';
import { ChatApiService } from '../../../../../core/services/chat/chat-api.service';
import { LocalChatRepository } from '../../../../../core/services/local-db/local-chat.repository';
import type { LocalChat, LocalChatKey, LocalPeerDevice } from '../../../../../core/services/local-db/local-db.types';
import { CryptoService } from '../../../../../core/services/crypto/crypto.service';
import { MasterKeyService } from '../../../../../core/services/crypto/master-key.service';

/** Данные, передаваемые в модалку создания чата. */
export interface CreateChatModalData {
  /** ID аккаунта собеседника. */
  readonly accountId: string;
  /** Отображаемое имя собеседника. */
  readonly displayName: string;
  /** Инициалы для аватара. */
  readonly initials: string;
  /** Цвет аватара. */
  readonly avatarColor: string;
  /** UIN собеседника или null. */
  readonly uin: string | null;
  /** Никнейм собеседника или null. */
  readonly nickname: string | null;
  /** Username собеседника или null. */
  readonly username: string | null;
}

/** Результат создания чата. */
export interface CreateChatModalResult {
  /** ID созданного чата. */
  readonly chatId: string;
}

/** Шаги модалки создания чата. */
type CreateChatStep = 'device' | 'name';

/** Модалка создания чата: выбор устройства → ввод названия → создание через API. */
@Component({
  imports: [FormsModule],
  selector: 'application-create-chat-modal',
  templateUrl: './create-chat-modal.component.html',
  styleUrl: './create-chat-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateChatModalComponent implements OnInit {
  /** Данные из диалога. */
  public readonly data: CreateChatModalData = inject<CreateChatModalData>(MAT_DIALOG_DATA);

  /** Текущий шаг модалки. */
  public readonly step: WritableSignal<CreateChatStep> = signal('device');

  /** Список сессий собеседника (null — загружаются). */
  public readonly sessions: WritableSignal<readonly ApiPeerSession[] | null> = signal(null);

  /** Идёт загрузка списка сессий. */
  public readonly loadingDevices: WritableSignal<boolean> = signal(true);

  /** Ошибка загрузки сессий. */
  public readonly devicesError: WritableSignal<boolean> = signal(false);

  /** Выбранная сессия устройства. */
  public readonly selectedSession: WritableSignal<ApiPeerSession | null> = signal(null);

  /** Название нового чата. */
  public chatName: string = '';

  /** Идёт создание чата. */
  public readonly creating: WritableSignal<boolean> = signal(false);

  /** Ошибка создания чата для отображения пользователю. */
  public readonly createError: WritableSignal<string | null> = signal(null);

  /** Ссылка на диалог для программного закрытия. */
  private readonly _dialogRef: MatDialogRef<CreateChatModalComponent, CreateChatModalResult> =
    inject<MatDialogRef<CreateChatModalComponent, CreateChatModalResult>>(MatDialogRef);

  /** API сессий. */
  private readonly _sessionApi: SessionApiService = inject(SessionApiService);

  /** API чатов. */
  private readonly _chatApi: ChatApiService = inject(ChatApiService);

  /** Репозиторий локальной БД. */
  private readonly _chatRepo: LocalChatRepository = inject(LocalChatRepository);

  /** Сервис криптографических примитивов. */
  private readonly _crypto: CryptoService = inject(CryptoService);

  /** Сервис мастер-ключа устройства. */
  private readonly _masterKey: MasterKeyService = inject(MasterKeyService);

  /** @inheritdoc */
  public ngOnInit(): void {
    void this._loadSessions();
  }

  /**
   * Метка устройства: прозвище или системное имя.
   * @param session - Сессия устройства.
   * @returns Строка для отображения.
   */
  public deviceLabel(session: ApiPeerSession): string {
    return session.nickname ?? session.system_name;
  }

  /** Закрыть без результата. */
  public close(): void {
    this._dialogRef.close();
  }

  /** Вернуться к выбору устройства. */
  public goBack(): void {
    this.step.set('device');
    this.selectedSession.set(null);
    this.chatName = '';
    this.createError.set(null);
  }

  /**
   * Выбрать устройство — переход к вводу названия.
   * @param session - Выбранная сессия.
   */
  public selectSession(session: ApiPeerSession): void {
    this.selectedSession.set(session);
    this.step.set('name');
  }

  /** Повторно загрузить список устройств после ошибки. */
  public retryLoad(): void {
    this.devicesError.set(false);
    this.loadingDevices.set(true);
    void this._loadSessions();
  }

  /** Создать чат — вызов API + запись в SQLite. */
  public confirmCreate(): void {
    const session = this.selectedSession();
    const name = this.chatName.trim();
    if (session === null || name === '' || this.creating()) return;
    void this._doCreate(session, name);
  }

  /** Загружает список публичных сессий собеседника. */
  private async _loadSessions(): Promise<void> {
    try {
      const result = await firstValueFrom(this._sessionApi.readSessions(this.data.accountId));
      this.sessions.set(result);
    } catch {
      this.devicesError.set(true);
    } finally {
      this.loadingDevices.set(false);
    }
  }

  /**
   * Выполняет создание чата: POST /chat/create → ECDH keygen → PATCH /chat/submit-key → SQLite.
   * @param session - Выбранная сессия собеседника.
   * @param name - Название чата.
   */
  private async _doCreate(session: ApiPeerSession, name: string): Promise<void> {
    this.creating.set(true);
    this.createError.set(null);

    try {
      const created = await firstValueFrom(this._chatApi.create(name, session.id));

      const now = Date.now();
      const createdAt = new Date(created.created_at).getTime();

      const chat: LocalChat = {
        id: created.id,
        name: created.name,
        status: created.status,
        peerSessionId: session.id,
        createdAt,
        updatedAt: now,
      };

      const peer: LocalPeerDevice = {
        sessionId: session.id,
        accountId: this.data.accountId,
        uin: this.data.uin,
        nickname: this.data.nickname,
        username: this.data.username,
        systemName: session.system_name,
        deviceNickname: session.nickname,
      };

      await this._chatRepo.upsertPeerDevice(peer);
      await this._chatRepo.upsertChat(chat);

      // E2E: генерируем ECDH пару и загружаем публичный ключ на сервер
      await this._submitEcdhKey(created.id, now);

      this._dialogRef.close({ chatId: created.id });
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.createError.set('Это название уже занято для этой пары устройств');
      } else {
        this.createError.set('Не удалось создать чат. Попробуйте ещё раз');
      }
      this.creating.set(false);
    }
  }

  /**
   * Генерирует ECDH X25519 пару, загружает публичный ключ на сервер и сохраняет
   * зашифрованный приватный ключ в SQLite chat_keys.
   * Ошибка submit-key не блокирует открытие чата — чат останется в pending_key.
   * @param chatId - ID созданного чата.
   * @param createdAt - Unix-время создания (мс).
   */
  private async _submitEcdhKey(chatId: string, createdAt: number): Promise<void> {
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
      createdAt,
    };
    await this._chatRepo.saveChatKey(chatKey);
  }
}
