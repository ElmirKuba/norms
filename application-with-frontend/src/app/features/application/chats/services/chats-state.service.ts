import { Injectable, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';

/** Сервис состояния раздела чатов — запоминает последний открытый чат */
@Injectable({ providedIn: 'root' })
export class ChatsStateService {
  /** ID последнего открытого чата (null = открыт список) */
  public readonly activeChatId: WritableSignal<string | null> = signal(null);

  /**
   * Установить активный чат.
   * @param chatId - идентификатор чата
   */
  public setActiveChat(chatId: string): void {
    this.activeChatId.set(chatId);
  }

  /** Сбросить активный чат (вернулись в список) */
  public clearActiveChat(): void {
    this.activeChatId.set(null);
  }
}
