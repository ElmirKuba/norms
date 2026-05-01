import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MOCK_CHATS } from '../../types/chats.types';
import type { MockChat } from '../../types/chats.types';

/** Экран списка чатов */
@Component({
  imports: [RouterLink],
  selector: 'application-chats',
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatsApplicationComponent {
  /** Список чатов (мок) */
  public readonly chats: MockChat[] = MOCK_CHATS;
}
