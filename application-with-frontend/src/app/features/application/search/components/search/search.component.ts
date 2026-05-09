import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, switchMap, debounceTime, of, EMPTY, catchError } from 'rxjs';
import type { Observable } from 'rxjs';
import { SearchApiService, avatarColorForId } from '../../services/search-api.service';
import type { SearchResultItem } from '../../services/search-api.service';

/** Отображаемый элемент результатов поиска. */
interface SearchDisplayItem {
  /** ID аккаунта. */
  readonly accountId: string;
  /** Отображаемое имя: @username или UIN XXXXX. */
  readonly displayName: string;
  /** UIN для второй строки (null если не назначен). */
  readonly uin: string | null;
  /** Инициалы для аватара. */
  readonly initials: string;
  /** Цвет аватара. */
  readonly avatarColor: string;
}

/**
 * Преобразует результат API в отображаемый элемент.
 * @param item - Элемент из API.
 * @returns Отображаемый элемент.
 */
function toDisplayItem(item: SearchResultItem): SearchDisplayItem {
  const displayName = item.username !== null ? `@${item.username}` : (item.uin !== null ? `UIN ${item.uin}` : 'Аккаунт');
  const initials = item.username !== null
    ? (item.username[0]?.toUpperCase() ?? '?')
    : (item.uin?.[0] ?? '?');
  return {
    accountId: item.account_id,
    displayName,
    uin: item.uin,
    initials,
    avatarColor: avatarColorForId(item.account_id),
  };
}

/** Экран поиска по UIN или username */
@Component({
  imports: [FormsModule],
  selector: 'application-search',
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchApplicationComponent {
  /** Поисковый запрос. */
  public readonly query: WritableSignal<string> = signal('');

  /** Результаты поиска. */
  public readonly results: WritableSignal<SearchDisplayItem[]> = signal([]);

  /** Идёт поиск. */
  public readonly loading: WritableSignal<boolean> = signal(false);

  /** Роутер для навигации. */
  private readonly _router: Router = inject(Router);

  /** API поиска. */
  private readonly _searchApi: SearchApiService = inject(SearchApiService);

  /** DestroyRef для автоотписки. */
  private readonly _destroyRef: DestroyRef = inject(DestroyRef);

  /** Subject для дебаунса запросов. */
  private readonly _querySubject: Subject<string> = new Subject<string>();

  public constructor() {
    this._querySubject.pipe(
      debounceTime(300),
      switchMap((q: string): Observable<SearchDisplayItem[]> => {
        if (q.trim().length === 0) {
          this.loading.set(false);
          this.results.set([]);
          return EMPTY;
        }
        this.loading.set(true);
        return this._searchApi.search(q.trim()).pipe(
          catchError((): Observable<SearchResultItem[]> => of([])),
        );
      }),
      takeUntilDestroyed(this._destroyRef),
    ).subscribe((items: SearchResultItem[] | SearchDisplayItem[]): void => {
      this.results.set((items as SearchResultItem[]).map(toDisplayItem));
      this.loading.set(false);
    });
  }

  /**
   * Обновить запрос из input.
   * @param value - Новое значение строки поиска.
   */
  public onQueryChange(value: string): void {
    this.query.set(value);
    this._querySubject.next(value);
  }

  /**
   * Открыть профиль пользователя.
   * @param item - Элемент результатов поиска.
   */
  public openProfile(item: SearchDisplayItem): void {
    void this._router.navigate(['/application/main/user', item.accountId]);
  }
}
