import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MOCK_CHATS, MOCK_MESSAGES } from '../../types/chats.types';
import { MOCK_SEARCH_USERS } from '../../../search/types/search.types';
import { ChatsStateService } from '../../services/chats-state.service';
import type { MockChat, MockMessage } from '../../types/chats.types';
import type { MockSearchUser } from '../../../search/types/search.types';

/** Экран отдельного чата */
@Component({
  imports: [FormsModule],
  selector: 'application-chat-detail',
  templateUrl: './chat-detail.component.html',
  styleUrl: './chat-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatDetailApplicationComponent implements OnInit {
  /** Данные чата */
  public readonly chat: WritableSignal<MockChat | null> = signal(null);

  /** Сообщения */
  public readonly messages: WritableSignal<MockMessage[]> = signal([]);

  /** Текст нового сообщения */
  public messageText: string = '';

  /** Роутер для навигации */
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** Сервис состояния чатов */
  private readonly _chatsState: ChatsStateService = inject(ChatsStateService);

  /** @inheritdoc */
  public ngOnInit(): void {
    const chatId = this._route.snapshot.paramMap.get('chatId');
    if (chatId === null) {
      void this._router.navigate(['/application/main/chats']);
      return;
    }

    const found = MOCK_CHATS.find((c: MockChat): boolean => c.id === chatId) ?? null;
    this.chat.set(found);

    if (found === null) {
      void this._router.navigate(['/application/main/chats']);
      return;
    }

    this._chatsState.setActiveChat(chatId);
    this.messages.set(MOCK_MESSAGES[chatId] ?? []);
  }

  /** Открыть профиль собеседника */
  public openContactProfile(): void {
    const currentChat = this.chat();
    if (currentChat === null) return;
    const user = MOCK_SEARCH_USERS.find((u: MockSearchUser): boolean => u.uin === currentChat.uin);
    if (user !== undefined) {
      void this._router.navigate(['/application/main/user', user.id]);
    }
  }

  /** Назад к списку чатов */
  public goBack(): void {
    this._chatsState.clearActiveChat();
    void this._router.navigate(['/application/main/chats']);
  }

  /** Отправка сообщения (мок) */
  public sendMessage(): void {
    const text = this.messageText.trim();
    if (text === '') return;

    const newMessage: MockMessage = {
      id: String(Date.now()),
      text,
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      status: 'sent',
    };

    this.messages.update((msgs: MockMessage[]): MockMessage[] => [...msgs, newMessage]);
    this.messageText = '';
  }

  /**
   * Повторная отправка упавшего сообщения (мок).
   * @param messageId - идентификатор сообщения для повторной отправки
   */
  public retryMessage(messageId: string): void {
    this.messages.update((msgs: MockMessage[]): MockMessage[] =>
      msgs.map((m: MockMessage): MockMessage => (m.id === messageId ? { ...m, status: 'sent' as const } : m)),
    );
  }
}
