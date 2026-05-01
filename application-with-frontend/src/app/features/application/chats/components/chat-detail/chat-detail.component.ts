import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MOCK_CHATS, MOCK_MESSAGES } from '../../types/chats.types';
import { MOCK_SEARCH_USERS } from '../../../search/types/search.types';
import { ChatsStateService } from '../../services/chats-state.service';
import type { MockChat, MockMessage } from '../../types/chats.types';

/** Экран отдельного чата */
@Component({
  imports: [FormsModule],
  selector: 'application-chat-detail',
  templateUrl: './chat-detail.component.html',
  styleUrl: './chat-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatDetailApplicationComponent implements OnInit {
  private readonly _route: ActivatedRoute = inject(ActivatedRoute);
  private readonly _router: Router = inject(Router);
  private readonly _chatsState: ChatsStateService = inject(ChatsStateService);

  /** Данные чата */
  public readonly chat = signal<MockChat | null>(null);

  /** Сообщения */
  public readonly messages = signal<MockMessage[]>([]);

  /** Текст нового сообщения */
  public messageText: string = '';

  /** @inheritdoc */
  public ngOnInit(): void {
    const chatId = this._route.snapshot.paramMap.get('chatId');
    if (!chatId) {
      void this._router.navigate(['/application/main/chats']);
      return;
    }

    const found = MOCK_CHATS.find((c) => c.id === chatId) ?? null;
    this.chat.set(found);

    if (!found) {
      void this._router.navigate(['/application/main/chats']);
      return;
    }

    this._chatsState.setActiveChat(chatId);
    this.messages.set(MOCK_MESSAGES[chatId] ?? []);
  }

  /** Открыть профиль собеседника */
  public openContactProfile(): void {
    const currentChat = this.chat();
    if (!currentChat) return;
    const user = MOCK_SEARCH_USERS.find((u) => u.uin === currentChat.uin);
    if (user) {
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
    if (!text) return;

    const newMessage: MockMessage = {
      id: String(Date.now()),
      text,
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      status: 'sent',
    };

    this.messages.update((msgs) => [...msgs, newMessage]);
    this.messageText = '';
  }

  /** Повторная отправка упавшего сообщения (мок) */
  public retryMessage(messageId: string): void {
    this.messages.update((msgs) =>
      msgs.map((m) => (m.id === messageId ? { ...m, status: 'sent' as const } : m)),
    );
  }
}
