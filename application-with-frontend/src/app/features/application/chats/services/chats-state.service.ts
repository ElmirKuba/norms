import { Injectable, signal } from '@angular/core';

/** Сервис состояния раздела чатов — запоминает последний открытый чат */
@Injectable({ providedIn: 'root' })
export class ChatsStateService {
  /** ID последнего открытого чата (null = открыт список) */
  public readonly activeChatId = signal<string | null>(null);

  /** Установить активный чат */
  public setActiveChat(chatId: string): void {
    this.activeChatId.set(chatId);
  }

  /** Сбросить активный чат (вернулись в список) */
  public clearActiveChat(): void {
    this.activeChatId.set(null);
  }
}
