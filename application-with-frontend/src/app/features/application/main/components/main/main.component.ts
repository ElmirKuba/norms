import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { OnInit, Signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { UinModalService } from '../../../uin/services/uin-modal.service';
import { ChatsStateService } from '../../../chats/services/chats-state.service';

/** Основной shell приложения: таббар + router-outlet для дочерних экранов */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'application-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainApplicationComponent implements OnInit {
  /** Ссылка для таба «Чаты»: открытый чат или список */
  public readonly chatsTabLink: Signal<string[]> = computed((): string[] => {
    const chatId = this._chatsState.activeChatId();
    return chatId !== null
      ? ['/application/main/chats', chatId]
      : ['/application/main/chats'];
  });

  /** Роутер для навигации и чтения navigation state */
  private readonly _router: Router = inject(Router);

  /** Сервис модалок UIN-флоу */
  private readonly _uinModal: UinModalService = inject(UinModalService);

  /** Сервис состояния чатов */
  private readonly _chatsState: ChatsStateService = inject(ChatsStateService);

  /** @inheritdoc */
  public ngOnInit(): void {
    const state = this._router.lastSuccessfulNavigation()?.extras.state as Record<string, unknown> | null | undefined;
    if (state?.['pendingUin'] === true) {
      this._uinModal.showPendingAndWait();
    }
  }
}
