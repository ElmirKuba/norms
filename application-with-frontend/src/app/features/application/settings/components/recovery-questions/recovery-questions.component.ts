import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MOCK_RECOVERY_QA, RECOVERY_PRESET_QUESTIONS } from '../../types/settings.types';
import type { MockRecoveryQA, RecoveryPresetQuestion } from '../../types/settings.types';

/** Подэкран настроек — Восстановление доступа */
@Component({
  imports: [FormsModule],
  selector: 'application-settings-recovery',
  templateUrl: './recovery-questions.component.html',
  styleUrl: './recovery-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRecoveryQuestionsComponent {
  /** Preset-вопросы */
  public readonly presetQuestions: RecoveryPresetQuestion[] = RECOVERY_PRESET_QUESTIONS;

  /** Список настроенных Q&A (мок) */
  public readonly qaList: WritableSignal<MockRecoveryQA[]> = signal(MOCK_RECOVERY_QA);

  /** Показывать форму добавления */
  public readonly showAddForm: WritableSignal<boolean> = signal(false);

  /** Выбранный preset-вопрос или свой */
  public readonly selectedPreset: WritableSignal<RecoveryPresetQuestion | null> = signal(null);

  /** Свой вопрос */
  public customQuestion: string = '';

  /** Ответ */
  public newAnswer: string = '';

  /** Принято предупреждение */
  public readonly warningAccepted: WritableSignal<boolean> = signal(false);

  /** ID редактируемого Q&A */
  public readonly editingId: WritableSignal<string | null> = signal(null);

  /** Вопрос в форме редактирования */
  public editQuestion: string = '';

  /** Ответ в форме редактирования */
  public editAnswer: string = '';

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** Назад к настройкам */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }

  /**
   * Выбрать preset.
   * @param q - выбранный preset-вопрос
   */
  public selectPreset(q: RecoveryPresetQuestion): void {
    this.selectedPreset.set(q);
    this.customQuestion = '';
  }

  /** Сохранить новый Q&A (мок) */
  public saveQA(): void {
    const question = this.selectedPreset()?.text ?? this.customQuestion.trim();
    if (question === '' || this.newAnswer.trim() === '') return;

    const newQA: MockRecoveryQA = {
      id: `mock_${String(Date.now())}`,
      question,
      createdAt: new Date().toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    this.qaList.update((list: MockRecoveryQA[]): MockRecoveryQA[] => [...list, newQA]);
    this.showAddForm.set(false);
    this.selectedPreset.set(null);
    this.customQuestion = '';
    this.newAnswer = '';
    this.warningAccepted.set(false);
  }

  /**
   * Удалить Q&A (мок).
   * @param id - идентификатор Q&A для удаления
   */
  public deleteQA(id: string): void {
    this.qaList.update((list: MockRecoveryQA[]): MockRecoveryQA[] => list.filter((qa: MockRecoveryQA): boolean => qa.id !== id));
  }

  /**
   * Открыть форму редактирования Q&A.
   * @param qa - Q&A для редактирования
   */
  public openEdit(qa: MockRecoveryQA): void {
    this.editingId.set(qa.id);
    this.editQuestion = qa.question;
    this.editAnswer = '';
  }

  /** Отменить редактирование */
  public cancelEdit(): void {
    this.editingId.set(null);
    this.editQuestion = '';
    this.editAnswer = '';
  }

  /** Сохранить изменения Q&A (мок) */
  public saveEdit(): void {
    const id = this.editingId();
    const question = this.editQuestion.trim();
    const answer = this.editAnswer.trim();
    if (id === null || question === '' || answer === '') return;

    this.qaList.update((list: MockRecoveryQA[]): MockRecoveryQA[] =>
      list.map((qa: MockRecoveryQA): MockRecoveryQA =>
        qa.id === id ? { ...qa, question } : qa,
      ),
    );
    this.cancelEdit();
  }
}
