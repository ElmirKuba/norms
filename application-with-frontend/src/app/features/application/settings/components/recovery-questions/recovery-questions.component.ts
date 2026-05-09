import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { OnInit, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { RecoveryApiService } from '../../services/recovery-api.service';
import type { PresetQuestion, RecoveryQuestion, CreateRecoveryQuestionResult } from '../../services/recovery-api.service';

/** Результат forkJoin загрузки preset + list. */
interface InitData {
  /** Пресет-вопросы. */
  readonly preset: PresetQuestion[];
  /** Q&A пары текущего аккаунта. */
  readonly list: RecoveryQuestion[];
}

/** Подэкран настроек — Восстановление доступа */
@Component({
  imports: [FormsModule],
  selector: 'application-settings-recovery',
  templateUrl: './recovery-questions.component.html',
  styleUrl: './recovery-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRecoveryQuestionsComponent implements OnInit {
  /** Список пресет-вопросов от бэка. */
  public readonly presetQuestions: WritableSignal<PresetQuestion[]> = signal([]);

  /** Список настроенных Q&A пар. */
  public readonly qaList: WritableSignal<RecoveryQuestion[]> = signal([]);

  /** Идёт начальная загрузка. */
  public readonly loading: WritableSignal<boolean> = signal(true);

  /** Показывать форму добавления. */
  public readonly showAddForm: WritableSignal<boolean> = signal(false);

  /** Выбранный preset-вопрос. */
  public readonly selectedPreset: WritableSignal<PresetQuestion | null> = signal(null);

  /** Свой вопрос. */
  public customQuestion: string = '';

  /** Ответ при добавлении. */
  public newAnswer: string = '';

  /** Принято предупреждение. */
  public readonly warningAccepted: WritableSignal<boolean> = signal(false);

  /** ID редактируемой Q&A. */
  public readonly editingId: WritableSignal<string | null> = signal(null);

  /** Вопрос в форме редактирования. */
  public editQuestion: string = '';

  /** Ответ в форме редактирования. */
  public editAnswer: string = '';

  /** Идёт сохранение (create/update/delete). */
  public readonly saving: WritableSignal<boolean> = signal(false);

  /** Роутер для навигации. */
  private readonly _router: Router = inject(Router);

  /** API для Q/A пар. */
  private readonly _recoveryApi: RecoveryApiService = inject(RecoveryApiService);

  /** @inheritdoc */
  public ngOnInit(): void {
    forkJoin({
      preset: this._recoveryApi.getPresetQuestions(),
      list: this._recoveryApi.readList(),
    }).subscribe({
      next: (result: InitData): void => {
        this.presetQuestions.set(result.preset);
        this.qaList.set(result.list);
        this.loading.set(false);
      },
      error: (): void => {
        this.loading.set(false);
      },
    });
  }

  /** Назад к настройкам. */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }

  /**
   * Выбрать preset-вопрос.
   * @param q - Выбранный вопрос.
   */
  public selectPreset(q: PresetQuestion): void {
    this.selectedPreset.set(q);
    this.customQuestion = '';
  }

  /** Сохранить новую Q&A пару через API. */
  public saveQA(): void {
    const question = this.selectedPreset()?.text ?? this.customQuestion.trim();
    if (question === '' || this.newAnswer.trim() === '') return;

    this.saving.set(true);
    this._recoveryApi.createQuestion(question, this.newAnswer.trim()).subscribe({
      next: (result: CreateRecoveryQuestionResult): void => {
        /* eslint-disable @typescript-eslint/naming-convention -- snake_case API fields */
        this.qaList.update((list: RecoveryQuestion[]): RecoveryQuestion[] => [
          ...list,
          { id: result.id, question: result.question, created_at: result.created_at, updated_at: result.created_at },
        ]);
        /* eslint-enable @typescript-eslint/naming-convention */
        this.showAddForm.set(false);
        this.selectedPreset.set(null);
        this.customQuestion = '';
        this.newAnswer = '';
        this.warningAccepted.set(false);
        this.saving.set(false);
      },
      error: (): void => {
        this.saving.set(false);
      },
    });
  }

  /**
   * Удалить Q&A через API.
   * @param id - ID вопроса.
   */
  public deleteQA(id: string): void {
    this._recoveryApi.deleteQuestion(id).subscribe({
      next: (): void => {
        this.qaList.update((list: RecoveryQuestion[]): RecoveryQuestion[] =>
          list.filter((qa: RecoveryQuestion): boolean => qa.id !== id),
        );
      },
    });
  }

  /**
   * Открыть форму редактирования.
   * @param qa - Q&A для редактирования.
   */
  public openEdit(qa: RecoveryQuestion): void {
    this.editingId.set(qa.id);
    this.editQuestion = qa.question;
    this.editAnswer = '';
  }

  /** Отменить редактирование. */
  public cancelEdit(): void {
    this.editingId.set(null);
    this.editQuestion = '';
    this.editAnswer = '';
  }

  /** Сохранить изменения Q&A через API. */
  public saveEdit(): void {
    const id = this.editingId();
    const question = this.editQuestion.trim();
    const answer = this.editAnswer.trim();
    if (id === null || question === '' || answer === '') return;

    this.saving.set(true);
    this._recoveryApi.updateQuestion(id, question, answer).subscribe({
      next: (): void => {
        this.qaList.update((list: RecoveryQuestion[]): RecoveryQuestion[] =>
          list.map((qa: RecoveryQuestion): RecoveryQuestion =>
            qa.id === id ? { ...qa, question } : qa,
          ),
        );
        this.saving.set(false);
        this.cancelEdit();
      },
      error: (): void => {
        this.saving.set(false);
      },
    });
  }

  /**
   * Форматирует ISO-дату в читаемую строку.
   * @param iso - ISO-8601 строка.
   * @returns Строка вида «12 апр 2025».
   */
  public formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
