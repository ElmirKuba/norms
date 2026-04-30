import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Экран списка чатов */
@Component({
  imports: [],
  selector: 'application-chats',
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatsApplicationComponent {}
